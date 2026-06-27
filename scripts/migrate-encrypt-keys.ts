#!/usr/bin/env tsx
// scripts/migrate-encrypt-keys.ts
// One-shot migration: encrypts any plaintext Gemini API keys in the database.
// Run ONCE after deploying lib/crypto.ts and setting ENCRYPTION_KEY.
//
// Safe to re-run: already-encrypted keys are detected by the ":" separator
// and skipped automatically.
//
//   Usage: ENCRYPTION_KEY=<hex> npx tsx scripts/migrate-encrypt-keys.ts

import { db }      from "../lib/db";
import { encrypt } from "../lib/crypto";

async function main() {
  if (!process.env.ENCRYPTION_KEY) {
    console.error("❌  ENCRYPTION_KEY not set");
    process.exit(1);
  }
  if (!process.env.DATABASE_URL) {
    console.error("❌  DATABASE_URL not set");
    process.exit(1);
  }

  console.log("Finding users with Gemini API keys…\n");

  const users = await db.user.findMany({
    where:  { geminiApiKey: { not: null } },
    select: { id: true, email: true, geminiApiKey: true },
  });

  console.log(`Found ${users.length} user(s) with API keys.\n`);

  let encrypted = 0;
  let skipped   = 0;
  let failed    = 0;

  for (const user of users) {
    const key = user.geminiApiKey!;

    // Already encrypted — contains ":" separator (IV:ciphertext format)
    if (key.includes(":")) {
      console.log(`  SKIP ${user.email} — already encrypted`);
      skipped++;
      continue;
    }

    try {
      const encryptedKey = await encrypt(key);
      await db.user.update({
        where: { id: user.id },
        data:  { geminiApiKey: encryptedKey },
      });
      console.log(`  ✓    ${user.email} — encrypted`);
      encrypted++;
    } catch (err) {
      console.error(`  ✗    ${user.email} — FAILED:`, err);
      failed++;
    }
  }

  console.log(`\n${"=".repeat(40)}`);
  console.log(`  Encrypted: ${encrypted}`);
  console.log(`  Skipped:   ${skipped} (already done)`);
  console.log(`  Failed:    ${failed}`);
  console.log("=".repeat(40));

  if (failed > 0) process.exit(1);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
