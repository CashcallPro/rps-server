var crypto = require('crypto');

const algorithm = 'aes-256-cbc';

// Make sure to store these securely (e.g., in ENV vars)
// 16-byte IV (fixed for simplicity, can be randomized if stored/transmitted safely)

function base64UrlEncode(buf: Buffer): string {
  return buf.toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

export function encryptForUrl(key: string, text: string): string {

  const secretKey = crypto
    .createHash('sha256')
    .update(key)
    .digest();
  const iv = Buffer.alloc(16, 0);

  const cipher = crypto.createCipheriv(algorithm, secretKey, iv);
  const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  return base64UrlEncode(encrypted);
}