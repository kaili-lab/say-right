CREATE TABLE `cards` (
	`card_id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`deck_id` text NOT NULL,
	`front_text` text NOT NULL,
	`back_text` text NOT NULL,
	`source_lang` text NOT NULL,
	`target_lang` text NOT NULL,
	`due_at` integer NOT NULL,
	`stability` real DEFAULT 0 NOT NULL,
	`difficulty` real DEFAULT 0 NOT NULL,
	`reps` integer DEFAULT 0 NOT NULL,
	`lapses` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`user_id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`deck_id`) REFERENCES `decks`(`deck_id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "ck_cards_reps_non_negative" CHECK("cards"."reps" >= 0),
	CONSTRAINT "ck_cards_lapses_non_negative" CHECK("cards"."lapses" >= 0)
);
--> statement-breakpoint
CREATE INDEX `idx_cards_user_deck` ON `cards` (`user_id`,`deck_id`);--> statement-breakpoint
CREATE INDEX `idx_cards_due_at` ON `cards` (`due_at`);--> statement-breakpoint
CREATE TABLE `decks` (
	`deck_id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`name` text NOT NULL,
	`is_default` integer DEFAULT false NOT NULL,
	`new_count` integer DEFAULT 0 NOT NULL,
	`learning_count` integer DEFAULT 0 NOT NULL,
	`due_count` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`user_id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "ck_decks_new_count_non_negative" CHECK("decks"."new_count" >= 0),
	CONSTRAINT "ck_decks_learning_count_non_negative" CHECK("decks"."learning_count" >= 0),
	CONSTRAINT "ck_decks_due_count_non_negative" CHECK("decks"."due_count" >= 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_decks_user_name` ON `decks` (`user_id`,`name`);--> statement-breakpoint
CREATE TABLE `review_logs` (
	`review_log_id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`card_id` text NOT NULL,
	`session_id` text NOT NULL,
	`rating_source` text NOT NULL,
	`final_rating` text NOT NULL,
	`is_new_card` integer DEFAULT false NOT NULL,
	`rated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`fsrs_snapshot` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`user_id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`card_id`) REFERENCES `cards`(`card_id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`session_id`) REFERENCES `review_sessions`(`session_id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "ck_review_logs_rating_source" CHECK("review_logs"."rating_source" in ('manual', 'ai')),
	CONSTRAINT "ck_review_logs_final_rating" CHECK("review_logs"."final_rating" in ('again', 'hard', 'good', 'easy'))
);
--> statement-breakpoint
CREATE INDEX `idx_review_logs_user_rated_at` ON `review_logs` (`user_id`,`rated_at`);--> statement-breakpoint
CREATE INDEX `idx_review_logs_session_rated_at` ON `review_logs` (`session_id`,`rated_at`);--> statement-breakpoint
CREATE INDEX `idx_review_logs_card_rated_at` ON `review_logs` (`card_id`,`rated_at`);--> statement-breakpoint
CREATE INDEX `idx_review_logs_user_card_rated_at` ON `review_logs` (`user_id`,`card_id`,`rated_at`);--> statement-breakpoint
CREATE TABLE `review_session_cards` (
	`session_id` text NOT NULL,
	`card_id` text NOT NULL,
	`ord` integer NOT NULL,
	PRIMARY KEY(`session_id`, `card_id`),
	FOREIGN KEY (`session_id`) REFERENCES `review_sessions`(`session_id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`card_id`) REFERENCES `cards`(`card_id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "ck_review_session_cards_ord_non_negative" CHECK("review_session_cards"."ord" >= 0)
);
--> statement-breakpoint
CREATE INDEX `idx_review_session_cards_session_ord` ON `review_session_cards` (`session_id`,`ord`);--> statement-breakpoint
CREATE TABLE `review_sessions` (
	`session_id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`deck_id` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`user_id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`deck_id`) REFERENCES `decks`(`deck_id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_review_sessions_user_created` ON `review_sessions` (`user_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `users` (
	`user_id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`password_hash` text NOT NULL,
	`nickname` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);