import { hashPassword } from "../src/lib/auth/password";

const password = process.argv[2];
if (!password) {
  console.error("Uso: npm run auth:hash-password -- <senha>");
  process.exit(1);
}

console.log(hashPassword(password));
