#!/usr/bin/env node
import bcrypt from 'bcryptjs';

const password = process.argv[2];

if (!password) {
  console.log('Usage: node server/generate_hash.js "<your_new_password>"');
  console.log('Example: node server/generate_hash.js "MySecurePassword2026!"');
  process.exit(1);
}

const saltRounds = 10;
const hash = bcrypt.hashSync(password, saltRounds);

console.log('\n======================================================');
console.log('  IDEATHON 2.0 ADMIN PASSWORD HASH GENERATOR');
console.log('======================================================');
console.log('Generated BCrypt Hash:');
console.log(`\nADMIN_PASSWORD_HASH=${hash}\n`);
console.log('To update your password:');
console.log('1. Copy the line above into your .env file.');
console.log('2. Restart the server: npm run server');
console.log('======================================================\n');
