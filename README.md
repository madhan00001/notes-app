# 📚 NoteShare — Student Notes Sharing Platform

A clean, modern, and fully functional notes-sharing website for students.  
Built with **Node.js + Express**, **MySQL**, and **vanilla HTML/CSS/JS**.

---

## 🖥️ Tech Stack

| Layer    | Technology                      |
|----------|---------------------------------|
| Frontend | HTML5, CSS3, Vanilla JavaScript |
| Backend  | Node.js + Express.js            |
| Database | MySQL 8.x                       |
| Auth     | express-session + bcryptjs      |
| Files    | Multer (multipart upload)       |

---

## 📁 Project Structure

```
notes-app/
├── config/
│   └── db.js               # MySQL connection pool
├── public/
│   ├── css/
│   │   └── style.css       # All styles
│   ├── js/
│   │   └── app.js          # Shared JS utilities
│   ├── index.html          # Homepage
│   ├── login.html          # Login page
│   ├── register.html       # Register page
│   ├── dashboard.html      # User dashboard
│   ├── upload.html         # Upload notes page
│   └── view-notes.html     # Browse notes page
├── routes/
│   ├── auth.js             # Auth API routes
│   └── notes.js            # Notes API routes
├── uploads/                # Uploaded files (auto-created)
├── .env.example            # Environment variables template
├── package.json
├── schema.sql              # Database schema
└── server.js               # Entry point
```

---

## ⚡ Quick Setup Guide

### Prerequisites
- Node.js v18+ — https://nodejs.org
- MySQL 8.x — https://dev.mysql.com/downloads/
- npm (comes with Node)

---

### Step 1 — Clone or extract the project

```bash
cd notes-app
```

---

### Step 2 — Install dependencies

```bash
npm install
```

---

### Step 3 — Set up MySQL Database

Open **MySQL Workbench** or run in terminal:

```bash
mysql -u root -p
```

Then paste and run the contents of `schema.sql`:

```sql
CREATE DATABASE IF NOT EXISTS student_notes;
USE student_notes;

CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS notes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    subject VARCHAR(100) NOT NULL,
    description TEXT,
    file_path VARCHAR(500) NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_size INT DEFAULT 0,
    uploaded_by INT NOT NULL,
    upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    download_count INT DEFAULT 0,
    FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE CASCADE
);
```

---

### Step 4 — Configure environment

Copy the example file and edit it:

```bash
cp .env.example .env
```

Open `.env` and fill in your details:

```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=student_notes
SESSION_SECRET=change_this_to_any_random_string
PORT=3000
```

---

### Step 5 — Start the server

```bash
# Production
npm start

# Development (with auto-reload)
npm run dev
```

> Visit: **http://localhost:3000**

---

## 🌐 Pages & Features

| Page            | URL             | Description                              |
|-----------------|-----------------|------------------------------------------|
| Homepage        | `/`             | Hero, search, latest notes, features     |
| Login           | `/login`        | Email + password login                   |
| Register        | `/register`     | Account creation with password strength  |
| Dashboard       | `/dashboard`    | Personal stats + uploaded notes          |
| Upload Notes    | `/upload`       | Upload PDF/DOC with title, subject, desc |
| Browse Notes    | `/view-notes`   | All notes with search + filter           |

---

## 🔌 API Endpoints

### Auth
| Method | Endpoint              | Description          |
|--------|-----------------------|----------------------|
| POST   | `/api/auth/register`  | Register new user    |
| POST   | `/api/auth/login`     | Login                |
| POST   | `/api/auth/logout`    | Logout               |
| GET    | `/api/auth/me`        | Get session info     |

### Notes
| Method | Endpoint                    | Description                    |
|--------|-----------------------------|--------------------------------|
| POST   | `/api/notes/upload`         | Upload new note (auth required)|
| GET    | `/api/notes`                | List all notes (search/filter) |
| GET    | `/api/notes/latest`         | Latest 6 notes (homepage)      |
| GET    | `/api/notes/my`             | Current user's notes           |
| GET    | `/api/notes/subjects`       | All distinct subjects          |
| GET    | `/api/notes/download/:id`   | Download a file                |
| DELETE | `/api/notes/:id`            | Delete a note (owner only)     |

---

## 🔐 Security Features

- Passwords hashed with **bcryptjs** (12 rounds)
- Sessions secured with **express-session** + httpOnly cookies
- File type validation on server (whitelist approach)
- File size limited to **20MB**
- SQL injection prevented via **parameterized queries**
- Users can only delete **their own** notes

---

## 📦 Allowed File Types

`.pdf` `.doc` `.docx` `.ppt` `.pptx` `.txt` `.png` `.jpg` `.jpeg`

---

## 🐞 Troubleshooting

**MySQL connection error:**
- Check your `.env` DB credentials
- Ensure MySQL is running: `sudo service mysql start`

**Port in use:**
- Change `PORT=3000` in `.env` to another port (e.g. 3001)

**npm install fails:**
- Run: `npm cache clean --force && npm install`

**File upload not working:**
- The `/uploads` folder is created automatically; check write permissions

---

## 📄 License
MIT — Free to use and modify.
