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
const MongoStore = require('connect-mongo');
const AWS = require('aws-sdk');
const multerS3 = require('multer-s3');

dotenv.config();

const app = express();
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
  store: MongoStore.create({ mongoUrl: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/atual-layout' }),
  cookie: { secure: process.env.NODE_ENV === 'production' }
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

mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/atual-layout')
  .then(() => console.log('MongoDB conectado'))
  .catch((err) => console.error('Erro ao conectar MongoDB:', err));

// Ensure an admin user exists on startup (created from env vars if provided)
mongoose.connection.once('open', async () => {
  try {
    const count = await Admin.countDocuments();
    if (count === 0) {
      const username = process.env.ADMIN_USER || 'admin';
      const password = process.env.ADMIN_PASS || null;
      if (!password) {
        console.warn('No ADMIN_PASS provided in env; create an admin user before deploying or set ADMIN_USER and ADMIN_PASS in Render.');
        return;
      }
      const hash = await bcrypt.hash(password, 10);
      await Admin.create({ username, passwordHash: hash });
      console.log(`Admin user created: ${username}`);
    }
  } catch (e) {
    console.error('Error ensuring admin user:', e);
  }
});

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

const Feedback = mongoose.model('Feedback', feedbackSchema);

const adminSchema = new mongoose.Schema({
  username: { type: String, unique: true },
  passwordHash: String,
  createdAt: { type: Date, default: Date.now }
});

const Admin = mongoose.model('Admin', adminSchema);

app.get('/', (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.post('/api/feedback', upload.fields([{ name: 'photos', maxCount: 5 }, { name: 'audio', maxCount: 1 }]), async (req, res) => {
  try {
    const files = req.files || {};
    const photoUrls = (files.photos || []).map((file) => `/uploads/${file.filename}`);
    const audioUrl = files.audio && files.audio[0] ? `/uploads/${files.audio[0].filename}` : null;

    const feedback = new Feedback({
      clientName: req.body.clientName,
      city: req.body.city,
      serviceDate: req.body.serviceDate,
      serviceRating: Number(req.body.serviceRating || 0),
      layoutExpectation: req.body.layoutExpectation,
      improvements: Array.isArray(req.body.improvements) ? req.body.improvements : (req.body.improvements ? [req.body.improvements] : []),
      teamRating: Number(req.body.teamRating || 0),
      message: req.body.message,
      audioUrl,
      photoUrls,
      testimonialAllowed: req.body.testimonialAllowed === 'true',
      recommend: req.body.recommend === 'true'
    });

    await feedback.save();
    res.json({ success: true, message: 'Resposta enviada com sucesso!' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Erro ao salvar resposta.' });
  }
});

app.get('/api/feedback', async (_req, res) => {
  try {
    const feedbacks = await Feedback.find().sort({ createdAt: -1 });
    res.json(feedbacks);
  } catch (error) {
    res.status(500).json({ message: 'Erro ao buscar feedbacks.' });
  }
});

app.get('/dashboard', (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

// Admin routes and APIs
app.get('/admin/login', (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin-login.html'));
});

app.post('/admin/login', async (req, res) => {
  const { username, password } = req.body;
  const admin = await Admin.findOne({ username });
  if (!admin) return res.status(401).json({ message: 'Invalid credentials' });
  const ok = await bcrypt.compare(password, admin.passwordHash);
  if (!ok) return res.status(401).json({ message: 'Invalid credentials' });
  req.session.isAdmin = true;
  req.session.adminUser = admin.username;
  res.json({ success: true });
});

app.get('/admin/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/admin/login'));
});

function requireAdmin(req, res, next) {
  if (req.session && req.session.isAdmin) return next();
  return res.status(401).json({ message: 'Unauthorized' });
}

app.get('/api/admin/feedback', requireAdmin, async (_req, res) => {
  const feedbacks = await Feedback.find().sort({ createdAt: -1 });
  res.json(feedbacks);
});

app.get('/admin/panel', (req, res) => {
  if (!req.session || !req.session.isAdmin) return res.redirect('/admin/login');
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
