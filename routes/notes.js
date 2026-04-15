const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('../config/db');

/* ---------------- MULTER SETUP ---------------- */

const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const ALLOWED_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
  'image/png',
  'image/jpeg'
];

const ALLOWED_EXTS = ['.pdf', '.doc', '.docx', '.ppt', '.pptx', '.txt', '.png', '.jpg', '.jpeg'];

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, unique + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ALLOWED_TYPES.includes(file.mimetype) && ALLOWED_EXTS.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type.'));
    }
  }
});

/* ---------------- AUTH MIDDLEWARE ---------------- */

function requireAuth(req, res, next) {
  if (!req.session.userId)
    return res.status(401).json({ error: 'Login required.' });
  next();
}

/* ---------------- ROUTES ---------------- */

// POST /api/notes/upload
router.post('/upload', requireAuth, upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded.' });

  const { title, subject, description } = req.body;
  if (!title || !subject)
    return res.status(400).json({ error: 'Title and subject are required.' });

  try {
    await db.query(
      `INSERT INTO notes (title, subject, description, file_path, file_name, file_size, uploaded_by)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [title, subject, description || '', req.file.filename, req.file.originalname, req.file.size, req.session.userId]
    );
    res.status(201).json({ message: 'Note uploaded successfully.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error.' });
  }
});

// GET /api/notes?search=&subject=
router.get('/', async (req, res) => {
  const { search, subject } = req.query;
  let query = `
    SELECT n.*, u.name AS uploader_name
    FROM notes n
    JOIN users u ON n.uploaded_by = u.id
    WHERE 1=1
  `;
  const params = [];

  if (search) {
    query += ' AND (n.title LIKE ? OR n.description LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }
  if (subject) {
    query += ' AND n.subject = ?';
    params.push(subject);
  }
  query += ' ORDER BY n.upload_date DESC';

  try {
    const [rows] = await db.query(query, params);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error.' });
  }
});

// GET /api/notes/latest
router.get('/latest', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT n.*, u.name AS uploader_name
      FROM notes n
      JOIN users u ON n.uploaded_by = u.id
      ORDER BY n.upload_date DESC
      LIMIT 6
    `);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error.' });
  }
});

// GET /api/notes/my
router.get('/my', requireAuth, async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT * FROM notes WHERE uploaded_by = ? ORDER BY upload_date DESC',
      [req.session.userId]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error.' });
  }
});

// GET /api/notes/subjects
router.get('/subjects', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT DISTINCT subject FROM notes ORDER BY subject');
    res.json(rows.map(r => r.subject));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error.' });
  }
});

// GET /api/notes/download/:id
router.get('/download/:id', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM notes WHERE id = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Note not found.' });

    const note = rows[0];
    const filePath = path.join(UPLOADS_DIR, note.file_path);

    if (!fs.existsSync(filePath))
      return res.status(404).json({ error: 'File not found on server.' });

    await db.query('UPDATE notes SET download_count = download_count + 1 WHERE id = ?', [note.id]);

    res.download(filePath, note.file_name);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error.' });
  }
});

// DELETE /api/notes/:id
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM notes WHERE id = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Note not found.' });

    const note = rows[0];
    if (note.uploaded_by !== req.session.userId)
      return res.status(403).json({ error: 'Not authorized.' });

    const filePath = path.join(UPLOADS_DIR, note.file_path);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

    await db.query('DELETE FROM notes WHERE id = ?', [req.params.id]);
    res.json({ message: 'Note deleted.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error.' });
  }
});

module.exports = router;
