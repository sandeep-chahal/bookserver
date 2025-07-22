const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}

// Middleware to parse form data
app.use(express.urlencoded({ extended: true }));

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => cb(null, file.originalname)
});
const upload = multer({ storage });

// Serve static files for downloads
app.use('/uploads', express.static(uploadDir));

// Main page
app.get('/', (req, res) => {
    fs.readdir(uploadDir, (err, files) => {
        if (err) files = [];
        // Gather file stats for sorting
        const fileData = files.map(filename => {
            const filepath = path.join(uploadDir, filename);
            const stat = fs.statSync(filepath);
            return { filename, mtime: stat.mtime };
        });
        // Sort by modified time, latest first
        fileData.sort((a, b) => b.mtime - a.mtime);

        res.send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
        <title>File Upload/Download/Delete</title>
        <style>
          body { max-width: 500px; margin: 40px auto; font-family: sans-serif; }
          h2 { border-bottom: 1px solid #ddd; padding-bottom: 0.3em; }
          ul { list-style: none; padding: 0; }
          li { margin-bottom: 1em; display: flex; align-items: center; justify-content: space-between; }
          label { display: block; margin-bottom: 0.5em; }
          input[type="file"] { margin-bottom: 1em; }
          .upload-form { border: 1px solid #ddd; padding: 1em; border-radius: 8px; }
          .download-list { margin-top: 2em; }
          .filename-link { flex: 1; text-decoration: none; color: #0074d9; word-break: break-all;}
          .actions { display: flex; gap: 0.5em;}
          button.delete-btn { background: #ff4136; color: #fff; border: none; padding: 0.3em 0.7em; border-radius: 4px; cursor: pointer;}
          button.delete-btn:hover { background: #e22; }
          .date { font-size: 0.8em; color: #666; margin-left: 0.7em; }
        </style>
      </head>
      <body>
        <h2>Upload a File</h2>
        <form class="upload-form" action="/upload" method="post" enctype="multipart/form-data">
          <label for="file">Choose file:</label>
          <input type="file" id="file" name="file" required />
          <button type="submit">Upload</button>
        </form>
        <div class="download-list">
          <h2>Files (Latest First)</h2>
          <ul>
            ${fileData.map(f => `
              <li>
                <a class="filename-link" href="/uploads/${encodeURIComponent(f.filename)}" download>${f.filename}</a>
                <span class="date">${f.mtime.toLocaleString()}</span>
                <form class="actions" action="/delete" method="post" onsubmit="return confirm('Delete ${f.filename}?');" style="margin:0;">
                  <input type="hidden" name="filename" value="${encodeURIComponent(f.filename)}" />
                  <button class="delete-btn" type="submit" title="Delete file">&times;</button>
                </form>
              </li>
            `).join('')}
          </ul>
        </div>
      </body>
      </html>
    `);
    });
});

// Upload endpoint
app.post('/upload', upload.single('file'), (req, res) => {
    res.redirect('/');
});

// Delete endpoint
app.post('/delete', (req, res) => {
    let filename = req.body.filename;
    if (!filename) return res.redirect('/');
    // Decode in case of spaces and special chars
    filename = decodeURIComponent(filename);
    const filePath = path.join(uploadDir, filename);
    fs.unlink(filePath, err => {
        // Ignore errors if file missing
        res.redirect('/');
    });
});

// Listen
app.listen(PORT, () => {
    console.log(`Server started on http://localhost:${PORT}`);
});