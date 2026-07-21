const test = require('node:test');
const assert = require('node:assert');
const path = require('path');
const { spawn } = require('node:child_process');

test('server stays up without MongoDB and serves the admin login page', async () => {
  const child = spawn(process.execPath, ['server.js'], {
    cwd: path.resolve(__dirname, '..'),
    env: { ...process.env, MONGODB_URI: '' }
  });

  let output = '';
  child.stdout.on('data', (data) => {
    output += data.toString();
  });
  child.stderr.on('data', (data) => {
    output += data.toString();
  });

  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      if (child.exitCode === null) {
        child.kill();
        resolve();
      } else {
        reject(new Error(`Server exited early with code ${child.exitCode}\n${output}`));
      }
    }, 3000);

    child.once('exit', (code) => {
      clearTimeout(timer);
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Server exited with code ${code}\n${output}`));
      }
    });
  });

  assert.match(output, /Servidor rodando/);
});
