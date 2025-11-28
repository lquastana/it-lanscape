// generate_hash.js
import bcrypt from 'bcrypt';

async function generateHash(password) {
  const saltRounds = 10;
  const hashedPassword = await bcrypt.hash(password, saltRounds);
  console.log(hashedPassword);
}

const password = process.argv[2];

if (!password) {
  console.error("❌ Aucun mot de passe fourni. Usage : node generate_hash.js <password>");
  process.exit(1);
}

generateHash(password);