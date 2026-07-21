const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');
const session = require('express-session');
const AWS = require('aws-sdk');
const multerS3 = require('multer-s3');
const nodemailer = require('nodemailer');

dotenv.config();

const app = express();
app.set('trust proxy', 1);
const PORT = process.env.PORT || 3000;
const uploadDir = path.join(__dirname, 'public', 'uploads');

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

app.use(cors());

app.use(session({
  secret: process.env.SESSION_SECRET || 'change_this_secret',
  resave: false,
  saveUninitialized: false,
  proxy: true,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'lax'
  }
}));

app.use((req, res, next) => {
  res.locals.isAdmin = req.session && req.session.isAdmin;
  next();
});
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

let storage;
if (process.env.AWS_S3_BUCKET && process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
  AWS.config.update({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION || 'us-east-1'
  });
  const s3 = new AWS.S3();
  storage = multerS3({
    s3: s3,
    bucket: process.env.AWS_S3_BUCKET,
    acl: 'public-read',
    metadata: function (req, file, cb) {
      cb(null, { fieldName: file.fieldname });
    },
    key: function (req, file, cb) {
      const ext = path.extname(file.originalname);
      cb(null, `${uuidv4()}${ext}`);
    }
  });
} else {
  storage = multer.diskStorage({
    destination: function (_req, _file, cb) {
      cb(null, path.join(__dirname, 'public', 'uploads'));
    },
    filename: function (_req, file, cb) {
      const ext = path.extname(file.originalname);
      cb(null, `${uuidv4()}${ext}`);
    }
  });
}
const upload = multer({ storage });

const mongoUri = process.env.MONGODB_URI && process.env.MONGODB_URI.trim()
  ? process.env.MONGODB_URI.trim()
  : null;

let useMemoryStore = false;
const memoryFeedbacks = [];
const memoryAdmins = [];

const feedbackSchema = new mongoose.Schema({
  clientName: String,
  city: String,
  serviceDate: String,
  serviceRating: Number,
  layoutExpectation: String,
  improvements: [String],
  teamRating: Number,
  message: String,
  audioUrl: String,
  photoUrls: [String],
  testimonialAllowed: Boolean,
  recommend: Boolean,
  createdAt: { type: Date, default: Date.now }
});

const Feedback = mongoose.models.Feedback || mongoose.model('Feedback', feedbackSchema);

const adminSchema = new mongoose.Schema({
  username: { type: String, unique: true },
  passwordHash: String,
  createdAt: { type: Date, default: Date.now }
});

const Admin = mongoose.models.Admin || mongoose.model('Admin', adminSchema);

async function ensureAdminUser() {
  const username = process.env.ADMIN_USER || 'segundo';
  const password = process.env.ADMIN_PASS || '260579';

  if (useMemoryStore) {
    if (!memoryAdmins.some((item) => item.username === username)) {
      const hash = await bcrypt.hash(password, 10);
      memoryAdmins.push({ username, passwordHash: hash });
    }
    return;
  }

  try {
    const count = await Admin.countDocuments();
    if (count === 0) {
      const hash = await bcrypt.hash(password, 10);
      await Admin.create({ username, passwordHash: hash });
      console.log(`Admin user created: ${username}`);
    }
  } catch (e) {
    console.error('Error ensuring admin user:', e);
  }
}

async function initializeDatabase() {
  if (!mongoUri) {
    console.warn('MongoDB URI não informada, usando armazenamento em memória');
    useMemoryStore = true;
    await ensureAdminUser();
    return;
  }

  try {
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 3000,
      connectTimeoutMS: 3000
    });
    console.log('MongoDB conectado');
    useMemoryStore = false;
    await ensureAdminUser();
  } catch (err) {
    console.warn('MongoDB indisponível, usando armazenamento em memória:', err.message);
    useMemoryStore = true;
    await ensureAdminUser();
  }
}

async function saveFeedbackRecord(payload) {
  if (useMemoryStore) {
    const record = { ...payload, createdAt: new Date() };
    memoryFeedbacks.push(record);
    return record;
  }

  return new Feedback(payload).save();
}

async function listFeedbackRecords() {
  if (useMemoryStore) {
    return memoryFeedbacks.slice().sort((a, b) => b.createdAt - a.createdAt);
  }

  return Feedback.find().sort({ createdAt: -1 });
}

async function findAdminByUsername(username) {
  if (useMemoryStore) {
    return memoryAdmins.find((item) => item.username === username) || null;
  }

  return Admin.findOne({ username });
}

initializeDatabase();

app.get('/', (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.post('/api/feedback', upload.fields([{ name: 'photos', maxCount: 5 }]), async (req, res) => {
  try {
    const files = req.files || {};
    const photoUrls = (files.photos || []).map((file) => `/uploads/${file.filename}`);

    const feedback = await saveFeedbackRecord({
      clientName: req.body.clientName,
      city: req.body.city,
      serviceDate: req.body.serviceDate,
      serviceRating: Number(req.body.serviceRating || 0),
      layoutExpectation: req.body.layoutExpectation,
      improvements: Array.isArray(req.body.improvements) ? req.body.improvements : (req.body.improvements ? [req.body.improvements] : []),
      teamRating: Number(req.body.teamRating || 0),
      message: req.body.message,
      audioUrl: null,
      photoUrls,
      testimonialAllowed: req.body.testimonialAllowed === 'true',
      recommend: req.body.recommend === 'true'
    });
    // Send notification email if SMTP configured
    try {
      if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS && process.env.EMAIL_TO) {
        const transporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST,
          port: Number(process.env.SMTP_PORT || 587),
          secure: process.env.SMTP_SECURE === 'true',
          auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
        });
        const baseUrl = process.env.BASE_URL || `http://localhost:${PORT}`;
        const photoLinks = (files.photos || []).map(f => (process.env.AWS_S3_BUCKET ? f.location : `${baseUrl}/uploads/${f.filename}`));
        const mailBody = `New feedback received:\n\nClient: ${feedback.clientName}\nCity: ${feedback.city}\nDate: ${feedback.serviceDate}\nRating: ${feedback.serviceRating}\nLayout expectation: ${feedback.layoutExpectation}\nImprovements: ${feedback.improvements.join(', ')}\nTeam rating: ${feedback.teamRating}\nMessage: ${feedback.message || '-'}\nPhotos: ${photoLinks.join(', ')}\n\nView in panel: ${baseUrl}/admin/panel`;
        await transporter.sendMail({ from: process.env.EMAIL_FROM || process.env.SMTP_USER, to: process.env.EMAIL_TO, subject: `Novo feedback: ${feedback.clientName || 'sem nome'}`, text: mailBody });
      }
    } catch (mailErr) {
      console.error('Error sending notification email:', mailErr);
    }
    res.json({ success: true, message: 'Resposta enviada com sucesso!' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Erro ao salvar resposta.' });
  }
});

app.get('/api/feedback', async (_req, res) => {
  try {
    const feedbacks = await listFeedbackRecords();
    res.json(feedbacks);
  } catch (error) {
    res.status(500).json({ message: 'Erro ao buscar feedbacks.' });
  }
});

app.get('/dashboard', (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

// Admin routes and APIs
app.get('/admin', (_req, res) => {
  res.redirect('/admin/login');
});

app.get('/admin/login', (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin-login.html'));
});

app.post('/admin/login', async (req, res) => {
  const { username, password } = req.body;
  const admin = await findAdminByUsername(username);
  if (!admin) return res.status(401).json({ message: 'Invalid credentials' });
  const ok = await bcrypt.compare(password, admin.passwordHash);
  if (!ok) return res.status(401).json({ message: 'Invalid credentials' });
  req.session.isAdmin = true;
  req.session.adminUser = admin.username;
  res.json({ success: true, redirect: '/admin/panel' });
});

app.get('/admin/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/admin/login'));
});

function requireAdmin(req, res, next) {
  if (req.session && req.session.isAdmin) return next();
  return res.status(401).json({ message: 'Unauthorized' });
}

app.get('/api/admin/feedback', requireAdmin, async (_req, res) => {
  const feedbacks = await listFeedbackRecords();
  res.json(feedbacks);
});

app.get('/api/admin/feedback/export', requireAdmin, async (_req, res) => {
  const feedbacks = await listFeedbackRecords();
  const headers = ['clientName','city','serviceDate','serviceRating','layoutExpectation','improvements','teamRating','message','audioUrl','photoUrls','testimonialAllowed','recommend','createdAt'];
  function escapeCSV(val){
    if (val === null || val === undefined) return '';
    const s = typeof val === 'string' ? val : String(val);
    return '"' + s.replace(/"/g, '""') + '"';
  }
  const rows = feedbacks.map(f => {
    return headers.map(h => {
      if (h === 'improvements') return escapeCSV((f.improvements||[]).join(';'));
      if (h === 'photoUrls') return escapeCSV((f.photoUrls||[]).join(';'));
      return escapeCSV(f[h]);
    }).join(',');
  });
  const csv = headers.join(',') + '\n' + rows.join('\n');
  res.setHeader('Content-Type','text/csv');
  res.setHeader('Content-Disposition','attachment; filename="feedbacks.csv"');
  res.send(csv);
});

app.get('/admin/panel', (req, res) => {
  if (!req.session || !req.session.isAdmin) return res.redirect('/admin/login');
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
