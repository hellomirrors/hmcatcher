DROP TABLE `leads`;--> statement-breakpoint
CREATE TABLE `leads` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`session_id` integer,
	`dialog_id` integer,
	`provider` text NOT NULL,
	`contact` text NOT NULL,
	`vorname` text,
	`nachname` text,
	`email` text,
	`plz` text,
	`score` integer DEFAULT 0 NOT NULL,
	`bucket` text,
	`variables` text DEFAULT '{}' NOT NULL,
	`state` text DEFAULT 'active' NOT NULL,
	`consent_at` integer NOT NULL,
	`completed_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`session_id`) REFERENCES `dialog_sessions`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`dialog_id`) REFERENCES `dialogs`(`id`) ON UPDATE no action ON DELETE no action
);
