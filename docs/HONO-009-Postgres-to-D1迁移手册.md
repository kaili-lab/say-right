# HONO-009 Postgres -> D1 迁移执行手册

## 1. 目标与输入

- 目标：将现有 Postgres 业务数据导入 D1（SQLite）并输出一致性报告。
- 必需输入：
  - Postgres 连接串：`POSTGRES_DATABASE_URL`
  - 迁移快照输出路径（示例：`./tmp/postgres-snapshot.json`）
  - D1 本地文件路径（示例：`./tmp/say-right-d1.db`）

## 2. 迁移脚本

- 导出快照：`backend-hono/scripts/migration/export-postgres.ts`
- 导入 D1：`backend-hono/scripts/migration/import-d1.ts`
- 一致性校验：`backend-hono/scripts/migration/verify-d1.ts`

> 三个脚本均使用 Node 22 的 `--experimental-strip-types` 执行。

## 3. 执行步骤

1. 导出 Postgres 快照

```bash
cd backend-hono
POSTGRES_DATABASE_URL='postgres://user:pass@host:5432/db' \
node --experimental-strip-types ./scripts/migration/export-postgres.ts ./tmp/postgres-snapshot.json
```

2. 导入到 D1 文件

```bash
cd backend-hono
node --experimental-strip-types ./scripts/migration/import-d1.ts ./tmp/postgres-snapshot.json ./tmp/say-right-d1.db
```

3. 执行一致性校验

```bash
cd backend-hono
node --experimental-strip-types ./scripts/migration/verify-d1.ts ./tmp/postgres-snapshot.json ./tmp/say-right-d1.db
```

4. 验证测试门禁

```bash
cd backend-hono
pnpm test -- migration
pnpm check
```

## 4. 一致性报告说明

`verify-d1.ts` 输出字段：

- `ok`: 总体是否通过
- `tables[*].source_count/target_count`: 行数对比
- `tables[*].count_match`: 行数是否一致
- `tables[*].hash_match`: 关键字段哈希是否一致
- `tables[*].source_sample_hashes/target_sample_hashes`: 抽样哈希（用于审计追溯）

## 5. 可重复执行与回滚

- 脚本 `import-d1.ts` 每次执行会先清空 D1 业务表（按外键逆序），再按依赖顺序重灌，具备可重复执行能力。
- 回滚方式：
  1. 保留旧 D1 文件快照（迁移前复制）
  2. 若校验失败，直接回退到迁移前 D1 文件
  3. 修复导出/映射问题后重新执行 1~3 步

## 6. 风险与注意事项

- 时间字段：Postgres `timestamptz` 会在导入时统一转为 epoch 毫秒。
- `review_logs.fsrs_snapshot`：导入前会强制 JSON 规范化，避免字符串格式差异导致误判。
- 若 Postgres 数据量很大，建议按环境窗口执行导出，并保留导出快照做审计留档。
