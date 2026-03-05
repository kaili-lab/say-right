#!/usr/bin/env node
/**
 * 将 Postgres 快照导入 D1(SQLite)。
 *
 * 运行示例：
 *   node --experimental-strip-types ./scripts/migration/import-d1.ts ./tmp/postgres-snapshot.json ./tmp/say-right-d1.db
 */
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import { migrate } from 'drizzle-orm/libsql/migrator';
import * as schema from '../../src/db/schema';
import { importSnapshotToD1, parseMigrationSnapshot } from '../../src/migration/snapshot.ts';

async function main() {
  const snapshotPathArg = process.argv[2];
  const d1PathArg = process.argv[3];
  if (!snapshotPathArg || !d1PathArg) {
    throw new Error('usage: import-d1.ts <snapshot-path> <d1-db-path>');
  }

  const snapshotPath = resolve(snapshotPathArg);
  const d1Path = resolve(d1PathArg);
  const snapshotRaw = JSON.parse(await readFile(snapshotPath, 'utf8'));
  const snapshot = parseMigrationSnapshot(snapshotRaw);

  const client = createClient({ url: `file:${d1Path}` });
  const db = drizzle(client, { schema });
  await client.execute('PRAGMA foreign_keys = ON');

  try {
    const migrationsFolder = fileURLToPath(new URL('../../drizzle', import.meta.url));
    await migrate(db, { migrationsFolder });
    await importSnapshotToD1(db, snapshot);
    process.stdout.write(`import finished: ${d1Path}\n`);
  } finally {
    client.close();
  }
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
});
