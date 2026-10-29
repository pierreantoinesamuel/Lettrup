import express from 'express';
import path from 'path';

const app = express();

app.get('*', (req, res) => {
  if (req.path.startsWith('/assets/') || path.extname(req.path)) {
    res.status(404).set({
      'Cache-Control': 'no-store',
      'Content-Type': 'text/plain; charset=utf-8',
    }).send('Not found');
    return;
  }
  res.status(200).send('Hello SPA');
});

app.listen(3001, () => {
  import('http').then(http => {
    http.get('http://localhost:3001/login', (res) => {
      console.log(`Status for /login: ${res.statusCode}`);
      http.get('http://localhost:3001/favicon.ico', (res2) => {
        console.log(`Status for /favicon.ico: ${res2.statusCode}`);
        process.exit(0);
      });
    });
  });
});
