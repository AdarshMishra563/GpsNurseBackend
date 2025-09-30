const crypto = require('crypto');
const dotenv = require('dotenv');
dotenv.config();

const algorithm = 'aes-256-cbc';
const key = crypto.createHash('sha256').update(process.env.ENCRYPTION_KEY).digest(); 


const FIXED_IV = Buffer.alloc(16, 0);
function encrypt(text) {
  const cipher = crypto.createCipheriv(algorithm, key, FIXED_IV);

  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  return encrypted; 
}

function decrypt(encryptedHex) {
  const decipher = crypto.createDecipheriv(algorithm, key, FIXED_IV);

  let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

module.exports = { encrypt, decrypt };
