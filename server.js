const express = require('express');
const bodyParser = require('body-parser');
const Database = require('better-sqlite3');
const path = require('path');

const app = express();
const DB_FILE = path.join(__dirname, 'data.sqlite');

// Database initialize
const db = new Database(DB_FILE);

// Create table if not exists
db.exec(`
  CREATE TABLE IF NOT EXISTS submissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    message TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// Middlewares
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));

// POST route
app.post('/submit', (req, res) => {
  const { name, email, message } = req.body;

  if (!name || !email || !message) {
    return res.status(400).send("Please fill all fields");
  }

  const stmt = db.prepare(`
    INSERT INTO submissions (name, email, message)
    VALUES (?, ?, ?)
  `);

  stmt.run(name, email, message);

  res.redirect('/?saved=1');
});

// View all submissions
app.get('/submissions', (req, res) => {
  const rows = db.prepare(`SELECT * FROM submissions ORDER BY id DESC`).all();

  let html = `
    <html><head><title>Submissions</title></head><body>
    <h2>Submissions</h2>
    <table border="1" cellpadding="8">
    <tr><th>ID</th><th>Name</th><th>Email</th><th>Message</th><th>Time</th></tr>
  `;

  rows.forEach(r => {
    html += `
      <tr>
        <td>${r.id}</td>
        <td>${r.name}</td>
        <td>${r.email}</td>
        <td>${r.message}</td>
        <td>${r.created_at}</td>
      </tr>
    `;
  });

  html += "</table></body></html>";

  res.send(html);
});

// PORT for Render
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Server running on port", PORT);
});
