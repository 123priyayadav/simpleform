// server.js
const express = require('express');
const bodyParser = require('body-parser');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
const DB_FILE = path.join(__dirname, 'data.sqlite');

// Middleware
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// Initialize DB
const db = new sqlite3.Database(DB_FILE, (err) => {
  if (err) {
    console.error('Could not open database', err);
    process.exit(1);
  }
});
db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS submissions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      message TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
});

// POST endpoint to receive form data
app.post('/submit', (req, res) => {
  const { name, email, message } = req.body;

  // Very basic server-side validation
  if (!name || !email || !message) {
    return res.status(400).send('Please provide name, email and message.');
  }

  const stmt = db.prepare(`INSERT INTO submissions (name, email, message) VALUES (?, ?, ?)`);
  stmt.run(name, email, message, function(err) {
    if (err) {
      console.error('DB insert error', err);
      return res.status(500).send('Internal server error');
    }
    // Redirect back to form with a simple success query param (could show UI message)
    res.redirect('/?saved=1');
  });
  stmt.finalize();
});

// View submissions (simple HTML)
app.get('/submissions', (req, res) => {
  db.all(`SELECT id, name, email, message, created_at FROM submissions ORDER BY created_at DESC LIMIT 100`, [], (err, rows) => {
    if (err) {
      console.error('DB read error', err);
      return res.status(500).send('Internal server error');
    }

    let html = `
      <html><head><meta charset="utf-8"><title>Submissions</title>
      <style>
        body{font-family:Arial,Helvetica,sans-serif;padding:20px}
        table{border-collapse:collapse;width:100%}
        td,th{border:1px solid #ddd;padding:8px}
        th{background:#f7f7f7}
      </style>
      </head>
      <body>
      <h2>Submissions (latest 100)</h2>
      <table>
        <tr><th>ID</th><th>Name</th><th>Email</th><th>Message</th><th>When</th></tr>
    `;
    for (const r of rows) {
      html += `<tr>
        <td>${r.id}</td>
        <td>${escapeHtml(r.name)}</td>
        <td>${escapeHtml(r.email)}</td>
        <td>${escapeHtml(r.message)}</td>
        <td>${r.created_at}</td>
      </tr>`;
    }
    html += `</table></body></html>`;
    res.send(html);
  });
});

// Simple helper to escape output
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server started on http://localhost:${PORT}`);
});
