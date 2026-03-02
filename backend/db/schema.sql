-- Say Right v1 基础表结构（Neon/PostgreSQL）
--
-- 说明：
-- 1) 该 schema 用于把当前领域模型落到数据库，供 Neon 环境先完成结构对齐。
-- 2) API 已支持 memory/postgres 双后端切换，本文件用于持续对齐运行态结构。

CREATE TABLE IF NOT EXISTS users (
    user_id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS nickname TEXT;

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

CREATE TABLE IF NOT EXISTS review_sessions (
    session_id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    deck_id TEXT NOT NULL REFERENCES decks(deck_id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_review_sessions_user_created
    ON review_sessions (user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS review_session_cards (
    session_id TEXT NOT NULL REFERENCES review_sessions(session_id) ON DELETE CASCADE,
    card_id TEXT NOT NULL REFERENCES cards(card_id) ON DELETE CASCADE,
    ord INTEGER NOT NULL CHECK (ord >= 0),
    PRIMARY KEY (session_id, card_id)
);

CREATE INDEX IF NOT EXISTS idx_review_session_cards_session_ord
    ON review_session_cards (session_id, ord);

CREATE TABLE IF NOT EXISTS review_logs (
    review_log_id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    card_id TEXT NOT NULL REFERENCES cards(card_id) ON DELETE CASCADE,
    session_id TEXT NOT NULL REFERENCES review_sessions(session_id) ON DELETE CASCADE,
    rating_source TEXT NOT NULL CHECK (rating_source IN ('manual', 'ai')),
    final_rating TEXT NOT NULL CHECK (final_rating IN ('again', 'hard', 'good', 'easy')),
    is_new_card BOOLEAN NOT NULL DEFAULT FALSE,
    rated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    fsrs_snapshot JSONB NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_review_logs_user_rated_at
    ON review_logs (user_id, rated_at DESC);

CREATE INDEX IF NOT EXISTS idx_review_logs_session_rated_at
    ON review_logs (session_id, rated_at ASC);

CREATE INDEX IF NOT EXISTS idx_review_logs_card_rated_at
    ON review_logs (card_id, rated_at DESC);
