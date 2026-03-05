#!/usr/bin/env node
/**
 * 从 Postgres 导出迁移快照。
 *
 * 运行示例：
 *   POSTGRES_DATABASE_URL=postgres://... \
 *   node --experimental-strip-types ./scripts/migration/export-postgres.ts ./tmp/postgres-snapshot.json
 */
import { spawnSync } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import process from 'node:process';
import {
  MIGRATION_TABLE_ORDER,
  type MigrationSnapshot
} from '../../src/migration/snapshot.ts';

const TABLE_ORDER_BY: Record<(typeof MIGRATION_TABLE_ORDER)[number], string> = {
  users: 'user_id',
  decks: 'deck_id',
  cards: 'card_id',
  review_sessions: 'session_id',
  review_session_cards: 'session_id, card_id',
  review_logs: 'review_log_id'
};

function runPsql(databaseUrl: string, query: string) {
  const result = spawnSync(
    'psql',
    [databaseUrl, '-X', '-A', '-t', '-c', query],
    { encoding: 'utf8' }
  );
  if (result.status !== 0) {
    throw new Error(result.stderr.trim() || result.stdout.trim() || 'psql command failed');
  }
  return result.stdout.trim();
}

async function main() {
  const outputPathArg = process.argv[2];
  if (!outputPathArg) {
    throw new Error('usage: export-postgres.ts <snapshot-output-path>');
  }

  const databaseUrl = process.env.POSTGRES_DATABASE_URL?.trim();
  if (!databaseUrl) {
    throw new Error('POSTGRES_DATABASE_URL is required');
  }

  const tables: MigrationSnapshot['tables'] = {
    users: [],
    decks: [],
    cards: [],
    review_sessions: [],
    review_session_cards: [],
    review_logs: []
  };

  for (const table of MIGRATION_TABLE_ORDER) {
    const orderBy = TABLE_ORDER_BY[table];
    const query = `SELECT COALESCE(json_agg(t), '[]'::json)::text FROM (SELECT * FROM ${table} ORDER BY ${orderBy}) t;`;
    const raw = runPsql(databaseUrl, query);
    tables[table] = raw.length === 0 ? [] : JSON.parse(raw);
  }

  const snapshot: MigrationSnapshot = {
    source: 'postgres',
    exported_at: new Date().toISOString(),
    tables
  };

  const outputPath = resolve(outputPathArg);
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(snapshot, null, 2)}\n`, 'utf8');
  process.stdout.write(`snapshot written: ${outputPath}\n`);
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
});
