const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const uploadDir = path.join(__dirname, 'public', 'uploads');

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

app.use(cors());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

const storage = multer.diskStorage({
  destination: function (_req, _file, cb) {
    cb(null, path.join(__dirname, 'public', 'uploads'));
  },
  filename: function (_req, file, cb) {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  }
});
const upload = multer({ storage });

mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/atual-layout')
  .then(() => console.log('MongoDB conectado'))
  .catch((err) => console.error('Erro ao conectar MongoDB:', err));

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

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
