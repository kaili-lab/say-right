#!/usr/bin/env node
/**
 * 校验 D1 数据与 Postgres 快照的一致性。
 *
 * 运行示例：
 *   node --experimental-strip-types ./scripts/migration/verify-d1.ts ./tmp/postgres-snapshot.json ./tmp/say-right-d1.db
 */
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import process from 'node:process';
import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import * as schema from '../../src/db/schema';
import { parseMigrationSnapshot, verifySnapshotAgainstD1 } from '../../src/migration/snapshot.ts';

async function main() {
  const snapshotPathArg = process.argv[2];
  const d1PathArg = process.argv[3];
  if (!snapshotPathArg || !d1PathArg) {
    throw new Error('usage: verify-d1.ts <snapshot-path> <d1-db-path>');
  }

  const snapshotPath = resolve(snapshotPathArg);
  const d1Path = resolve(d1PathArg);
  const snapshotRaw = JSON.parse(await readFile(snapshotPath, 'utf8'));
  const snapshot = parseMigrationSnapshot(snapshotRaw);

  const client = createClient({ url: `file:${d1Path}` });
  const db = drizzle(client, { schema });
  await client.execute('PRAGMA foreign_keys = ON');

  try {
    const report = await verifySnapshotAgainstD1(db, snapshot);
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
    if (!report.ok) {
      process.exit(1);
    }
  } finally {
    client.close();
  }
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
});
