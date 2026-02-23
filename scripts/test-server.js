#!/usr/bin/env node

import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = 5173;
const TEST_FIXTURES_DIR = path.join(__dirname, '../tests/e2e/fixtures');

const server = http.createServer((req, res) => {
  // Handle CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // Default to test-form.html
  let filePath = req.url;
  if (filePath === '/' || filePath === '') {
    filePath = '/test-form.html';
  }

  // Security: prevent directory traversal
  const normalizedPath = path.normalize(filePath).replace(/^(\.\.(\/|\\|$))+/, '');
  const fullPath = path.join(TEST_FIXTURES_DIR, normalizedPath);

  // Verify the resolved path is within test fixtures
  if (!fullPath.startsWith(TEST_FIXTURES_DIR)) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end('403 Forbidden');
    return;
  }

  // Serve the file
  fs.readFile(fullPath, (err, content) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('404 Not Found');
      return;
    }

    // Set content type based on file extension
    const ext = path.extname(fullPath);
    const contentTypes = {
      '.html': 'text/html',
      '.css': 'text/css',
      '.js': 'text/javascript',
      '.json': 'application/json',
      '.csv': 'text/csv',
    };

    const contentType = contentTypes[ext] || 'text/plain';
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(content);
  });
});

server.listen(PORT, 'localhost', () => {
  console.log(`Test server running at http://localhost:${PORT}`);
  console.log(`Serving files from: ${TEST_FIXTURES_DIR}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, closing server');
  server.close();
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, closing server');
  server.close();
  process.exit(0);
});
