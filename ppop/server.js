const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const dir = './uploads';
    if (!fs.existsSync(dir)) fs.mkdirSync(dir);
    cb(null, dir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({
  storage: storage,
  limits: { fileSize: 15 * 1024 * 1024 }, // 15 MB limit
  fileFilter: function (req, file, cb) {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedTypes.test(ext)) cb(null, true);
    else cb(new Error('Only images are allowed'));
  }
});

// Store metadata in a simple JSON file for demo purposes
const META_PATH = './uploads/metadata.json';

// Helper to read/write metadata
function readMetadata() {
  if (!fs.existsSync(META_PATH)) return [];
  return JSON.parse(fs.readFileSync(META_PATH, 'utf8'));
}
function writeMetadata(data) {
  fs.writeFileSync(META_PATH, JSON.stringify(data, null, 2));
}

// Upload endpoint
app.post('/upload', upload.array('photos', 10), (req, res) => {
  const { town, lat, lon } = req.body;
  if (!town || !lat || !lon || !req.files) {
    return res.status(400).json({ error: 'Missing data' });
  }

  let meta = readMetadata();
  req.files.forEach(file => {
    meta.push({
      filename: file.filename,
      originalname: file.originalname,
      town,
      lat,
      lon,
      uploaded: new Date().toISOString()
    });
  });
  writeMetadata(meta);

  res.json({ success: true, files: req.files.map(f => f.filename) });
});

// Endpoint to list uploaded images + metadata
app.get('/images', (req, res) => {
  const meta = readMetadata();
  res.json(meta);
});

// Serve individual images
app.get('/image/:filename', (req, res) => {
  const filePath = path.join(__dirname, 'uploads', req.params.filename);
  if (!fs.existsSync(filePath)) return res.status(404).send('Not found');
  res.sendFile(filePath);
});

// Start server
app.listen(PORT, () => {
  console.log(`Backend listening on port ${PORT}`);
});