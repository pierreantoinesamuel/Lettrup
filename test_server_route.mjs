import http from 'http';
import { spawn } from 'child_process';

console.log("Starting server...");
const server = spawn('node', ['dist/server.cjs'], {
  env: { ...process.env, NODE_ENV: 'production' },
  stdio: 'inherit'
});

setTimeout(() => {
  console.log("Fetching /login...");
  http.get('http://localhost:3000/login', (res) => {
    console.log(`Status: ${res.statusCode}`);
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      console.log(`Body starts with: ${data.substring(0, 100)}`);
      console.log("Fetching /favicon.ico...");
      http.get('http://localhost:3000/favicon.ico', (res2) => {
        console.log(`Favicon Status: ${res2.statusCode}`);
        server.kill();
        process.exit(0);
      });
    });
  }).on('error', (e) => {
    console.error(e);
    server.kill();
    process.exit(1);
  });
}, 3000);
