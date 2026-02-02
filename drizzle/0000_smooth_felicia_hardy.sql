CREATE TABLE `media_sources` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`backend` text NOT NULL,
	`uri` text NOT NULL,
	`displayName` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `media_sources_backend_uri_unique` ON `media_sources` (`backend`,`uri`);