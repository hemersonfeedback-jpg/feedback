const test = require('node:test');
const assert = require('node:assert');
const path = require('path');
const { spawn } = require('node:child_process');

function waitForServer(url, timeoutMs = 5000) {
  const startedAt = Date.now();
  return new Promise((resolve, reject) => {
    const attempt = async () => {
      if (Date.now() - startedAt > timeoutMs) {
        reject(new Error(`Timed out waiting for ${url}`));
        return;
      }

      try {
        const response = await fetch(url);
        if (response.ok || response.status < 500) {
          resolve();
          return;
        }
      } catch (error) {
        // Ignore and retry until timeout expires.
      }

      setTimeout(attempt, 200);
    };

    attempt();
  });
}

test('server stays up without MongoDB and serves the admin login page', async () => {
  const port = 3100;
  const child = spawn(process.execPath, ['server.js'], {
    cwd: path.resolve(__dirname, '..'),
    env: { ...process.env, MONGODB_URI: '', PORT: String(port) }
  });

  let output = '';
  child.stdout.on('data', (data) => {
    output += data.toString();
  });
  child.stderr.on('data', (data) => {
    output += data.toString();
  });

  try {
    await waitForServer(`http://127.0.0.1:${port}/admin/login`);
    const response = await fetch(`http://127.0.0.1:${port}/admin/login`);
    assert.equal(response.status, 200);
    const html = await response.text();
    assert.match(html, /Admin - Entrar|Acesse o painel administrativo/);
  } finally {
    if (child.exitCode === null) {
      child.kill();
    }
  }

  assert.match(output, /Servidor rodando/);
});

test('testimonial endpoint returns only feedbacks authorized for publication', async () => {
  const port = 3101;
  const child = spawn(process.execPath, ['server.js'], {
    cwd: path.resolve(__dirname, '..'),
    env: { ...process.env, MONGODB_URI: '', PORT: String(port) }
  });

  let output = '';
  child.stdout.on('data', (data) => {
    output += data.toString();
  });
  child.stderr.on('data', (data) => {
    output += data.toString();
  });

  try {
    await waitForServer(`http://127.0.0.1:${port}/`);

    const authorizedPayload = new FormData();
    authorizedPayload.append('clientName', 'Ana');
    authorizedPayload.append('city', 'São Paulo');
    authorizedPayload.append('serviceDate', '2024-08-01');
    authorizedPayload.append('serviceRating', '5');
    authorizedPayload.append('layoutExpectation', 'Sim');
    authorizedPayload.append('teamRating', '5');
    authorizedPayload.append('message', 'Excelente atendimento');
    authorizedPayload.append('testimonialAllowed', 'true');
    authorizedPayload.append('recommend', 'true');

    authorizedPayload.append('photos', new Blob(['fake-image'], { type: 'image/jpeg' }), 'sample.jpg');

    const unauthorizedPayload = new FormData();
    unauthorizedPayload.append('clientName', 'Bruno');
    unauthorizedPayload.append('city', 'Campinas');
    unauthorizedPayload.append('serviceDate', '2024-08-02');
    unauthorizedPayload.append('serviceRating', '4');
    unauthorizedPayload.append('layoutExpectation', 'Parcialmente');
    unauthorizedPayload.append('teamRating', '4');
    unauthorizedPayload.append('message', 'Gostei do resultado');
    unauthorizedPayload.append('testimonialAllowed', 'false');
    unauthorizedPayload.append('recommend', 'true');

    const firstResponse = await fetch(`http://127.0.0.1:${port}/api/feedback`, { method: 'POST', body: authorizedPayload });
    assert.equal(firstResponse.status, 200);
    const secondResponse = await fetch(`http://127.0.0.1:${port}/api/feedback`, { method: 'POST', body: unauthorizedPayload });
    assert.equal(secondResponse.status, 200);

    const testimonialsResponse = await fetch(`http://127.0.0.1:${port}/api/testimonials`);
    assert.equal(testimonialsResponse.status, 200);
    const testimonials = await testimonialsResponse.json();
    assert.equal(testimonials.length, 1);
    assert.equal(testimonials[0].clientName, 'Ana');
    assert.equal(testimonials[0].testimonialAllowed, true);
    assert.ok(testimonials[0].photoUrls?.some((url) => url.includes('/uploads/')));
  } finally {
    if (child.exitCode === null) {
      child.kill();
    }
  }
});
