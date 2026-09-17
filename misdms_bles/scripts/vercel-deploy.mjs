import { execFileSync } from "node:child_process";

const required = ["DATABASE_URL", "DIRECT_URL", "NEXTAUTH_SECRET"];
const missing = required.filter((name) => !process.env[name]);

if (missing.length > 0) {
  throw new Error(
    `Missing required Vercel environment variables: ${missing.join(", ")}. ` +
      "Connect the project to Supabase and configure the required auth secrets."
  );
}

function run(step, command, args, env = process.env) {
  console.log(`\n=== ${step} ===`);
  try {
    execFileSync(command, args, {
      stdio: "inherit",
      env,
      shell: process.platform === "win32",
    });
  } catch (error) {
    const status = error && typeof error === "object" && "status" in error ? error.status : "unknown";
    throw new Error(`${step} failed with exit status ${status}. See the command output above for the root error.`);
  }
}

run("Prisma schema synchronization", "npx", ["prisma", "db", "push"]);
run("Initial database seed", "npx", ["tsx", "prisma/seed.ts"], {
  ...process.env,
  NODE_ENV: "production",
  SEED_DATABASE: "true",
});
run("Next.js production build", "npx", ["next", "build"]);
