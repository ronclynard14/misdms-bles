import { execFileSync } from "node:child_process";

const required = ["DATABASE_URL", "DIRECT_URL", "NEXTAUTH_SECRET"];
const missing = required.filter((name) => !process.env[name]);

if (missing.length > 0) {
  throw new Error(
    `Missing required Vercel environment variables: ${missing.join(", ")}. ` +
      "Connect the project to Supabase and configure the required auth secrets."
  );
}

function run(command, args, env = process.env) {
  execFileSync(command, args, { stdio: "inherit", env, shell: process.platform === "win32" });
}

run("npx", ["prisma", "db", "push"]);
run("npx", ["tsx", "prisma/seed.ts"], {
  ...process.env,
  NODE_ENV: "production",
  SEED_DATABASE: "true",
});
run("npx", ["next", "build"]);
