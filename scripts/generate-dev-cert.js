const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const certDir = path.join(os.homedir(), '.office-addin-dev-certs');
const keyFile = path.join(certDir, 'localhost.key');
const certFile = path.join(certDir, 'localhost.crt');

fs.mkdirSync(certDir, { recursive: true, mode: 0o700 });
execFileSync('openssl', [
  'req', '-x509', '-newkey', 'rsa:2048', '-nodes',
  '-days', '365', '-sha256',
  '-subj', '/CN=localhost',
  '-addext', 'subjectAltName=DNS:localhost,IP:127.0.0.1',
  '-keyout', keyFile,
  '-out', certFile,
], { stdio: 'ignore' });
fs.chmodSync(keyFile, 0o600);

console.log(`Development certificate created at ${certFile}`);
