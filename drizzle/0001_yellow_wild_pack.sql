CREATE TABLE `messages` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`provider` text NOT NULL,
	`direction` text NOT NULL,
	`contact` text NOT NULL,
	`kind` text NOT NULL,
	`body` text,
	`caption` text,
	`template_name` text,
	`external_id` text,
	`created_at` integer NOT NULL
);
