// Usage: npm run admin:hash            (prompts; nothing lands in shell history)
//    or: echo -n 'pw' | npm run -s admin:hash
// Prints a value for ADMIN_PASSWORD_HASH (format scrypt:<salt>:<hash>, no "$" so .env expansion is safe).
import { randomBytes, scryptSync } from "node:crypto";
import { createInterface } from "node:readline";

async function readPassword(): Promise<string> {
  if (process.argv[2]) return process.argv[2];
  const rl = createInterface({ input: process.stdin, output: process.stderr, terminal: process.stdin.isTTY });
  if (process.stdin.isTTY) process.stderr.write("Admin password: ");
  const line: string = await new Promise((res) => rl.once("line", res).once("close", () => res("")));
  rl.close();
  return line.trim();
}

readPassword().then((pw) => {
  if (pw.length < 10) {
    console.error("Password must be at least 10 characters.");
    process.exit(1);
  }
  const salt = randomBytes(16);
  console.log(`scrypt:${salt.toString("hex")}:${scryptSync(pw, salt, 64).toString("hex")}`);
});
