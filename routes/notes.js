const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const db = require('../config/db');
const { cloudinary, storage } = require('../config/cloudinary'); // ✅ Cloudinary

/* ---------------- MULTER SETUP (Cloudinary) ---------------- */

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

const upload = multer({
  storage, // ✅ Cloudinary storage (not disk)
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
    // ✅ req.file.path = permanent Cloudinary URL (e.g. https://res.cloudinary.com/...)
    // ✅ req.file.filename = Cloudinary public_id (used for deletion later)
    await db.query(
      `INSERT INTO notes (title, subject, description, file_path, file_name, file_size, uploaded_by)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        title,
        subject,
        description || '',
        req.file.path,          // ✅ Full Cloudinary URL (permanent)
        req.file.originalname,  // Original filename shown to users
        req.file.size,
        req.session.userId
      ]
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

// GET /api/notes/download/:id  ✅ Now redirects to Cloudinary URL
router.get('/download/:id', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM notes WHERE id = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Note not found.' });

    const note = rows[0];

    await db.query('UPDATE notes SET download_count = download_count + 1 WHERE id = ?', [note.id]);

    // ✅ file_path is now a full Cloudinary URL — just redirect to it
    res.redirect(note.file_path);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error.' });
  }
});

// DELETE /api/notes/:id  ✅ Also deletes from Cloudinary
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM notes WHERE id = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Note not found.' });

    const note = rows[0];
    if (note.uploaded_by !== req.session.userId)
      return res.status(403).json({ error: 'Not authorized.' });

    // ✅ Delete from Cloudinary using the public_id extracted from the URL
    try {
      const urlParts = note.file_path.split('/');
      const fileWithExt = urlParts[urlParts.length - 1];
      const publicId = 'noteshare/' + fileWithExt.replace(/\.[^/.]+$/, ''); // strip extension
      await cloudinary.uploader.destroy(publicId, { resource_type: 'raw' });
      // Also try image resource type (for jpg/png)
      await cloudinary.uploader.destroy(publicId, { resource_type: 'image' }).catch(() => {});
    } catch (cloudErr) {
      console.warn('Cloudinary delete warning (non-fatal):', cloudErr.message);
    }

    await db.query('DELETE FROM notes WHERE id = ?', [req.params.id]);
    res.json({ message: 'Note deleted.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error.' });
  }
});

module.exports = router;
