CREATE TABLE `media_sources` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`type` text NOT NULL,
	`uri` text NOT NULL,
	`displayName` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `media_sources_type_uri_unique` ON `media_sources` (`type`,`uri`);