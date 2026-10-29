CREATE TABLE `rooms` (
	`code` text PRIMARY KEY NOT NULL,
	`revision` integer NOT NULL,
	`expires` integer NOT NULL,
	`data` text NOT NULL
);
