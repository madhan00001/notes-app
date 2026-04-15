const express = require('express');
const session = require('express-session');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

/* ---------------- MIDDLEWARE ---------------- */

app.use(cors({
  origin: true,
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/* ---------------- SESSION CONFIG ---------------- */

app.use(session({
  secret: process.env.SESSION_SECRET || 'notesapp_secret_key_2024',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false,   // false = works over HTTP
    httpOnly: true,
    maxAge: 7 * 24 * 60 * 60 * 1000
  }
}));

/* ---------------- STATIC FILES ---------------- */

app.use(express.static(path.join(__dirname, 'public')));

/* ---------------- API ROUTES ---------------- */

app.use('/api/auth', require('./routes/auth'));
app.use('/api/notes', require('./routes/notes'));

/* ---------------- HTML ROUTES ---------------- */

app.get('/', (req, res) =>
  res.sendFile(path.join(__dirname, 'public', 'index.html'))
);

app.get('/login', (req, res) =>
  res.sendFile(path.join(__dirname, 'public', 'login.html'))
);

app.get('/register', (req, res) =>
  res.sendFile(path.join(__dirname, 'public', 'register.html'))
);

app.get('/dashboard', (req, res) =>
  res.sendFile(path.join(__dirname, 'public', 'dashboard.html'))
);

app.get('/upload', (req, res) =>
  res.sendFile(path.join(__dirname, 'public', 'upload.html'))
);

app.get('/view-notes', (req, res) =>
  res.sendFile(path.join(__dirname, 'public', 'view-notes.html'))
);

/* ---------------- 404 FALLBACK ---------------- */

app.use((req, res) => {
  res.status(404).sendFile(path.join(__dirname, 'public', 'index.html'));
});

/* ---------------- START SERVER ---------------- */

app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});
