-- Say Right v1 基础表结构（Neon/PostgreSQL）
--
-- 说明：
-- 1) 该 schema 用于把当前领域模型落到数据库，供 Neon 环境先完成结构对齐。
-- 2) 当前业务读写仍由内存仓储承载，本文件先保证“结构可同步、可演进”。

CREATE TABLE IF NOT EXISTS users (
    user_id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS decks (
    deck_id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    new_count INTEGER NOT NULL DEFAULT 0 CHECK (new_count >= 0),
    learning_count INTEGER NOT NULL DEFAULT 0 CHECK (learning_count >= 0),
    due_count INTEGER NOT NULL DEFAULT 0 CHECK (due_count >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_decks_user_name_ci
    ON decks (user_id, lower(name));

CREATE TABLE IF NOT EXISTS cards (
    card_id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    deck_id TEXT NOT NULL REFERENCES decks(deck_id) ON DELETE CASCADE,
    front_text TEXT NOT NULL,
    back_text TEXT NOT NULL,
    source_lang TEXT NOT NULL,
    target_lang TEXT NOT NULL,
    due_at TIMESTAMPTZ NOT NULL,
    stability DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    difficulty DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    reps INTEGER NOT NULL DEFAULT 0 CHECK (reps >= 0),
    lapses INTEGER NOT NULL DEFAULT 0 CHECK (lapses >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cards_user_deck ON cards (user_id, deck_id);
CREATE INDEX IF NOT EXISTS idx_cards_due_at ON cards (due_at);
