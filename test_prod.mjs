import http from 'http';
import { spawn } from 'child_process';

const server = spawn('node', ['dist/server.cjs'], {
  env: { ...process.env, NODE_ENV: 'production' }
});

server.stdout.on('data', (data) => {
  console.log(`stdout: ${data}`);
  if (data.toString().includes('Express server running')) {
    http.get('http://localhost:3000/login', (res) => {
      console.log(`Status /login: ${res.statusCode}`);
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => {
        console.log(`Body starts with: ${body.substring(0, 100)}`);
        
        http.get('http://localhost:3000/favicon.ico', (res2) => {
          console.log(`Status /favicon.ico: ${res2.statusCode}`);
          server.kill();
          process.exit(0);
        });
      });
    });
  }
});
server.stderr.on('data', (data) => console.error(`stderr: ${data}`));
