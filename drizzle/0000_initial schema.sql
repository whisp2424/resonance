CREATE TABLE `album_artists` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `albums` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`albumArtistId` integer NOT NULL,
	`title` text NOT NULL,
	`releaseDate` text,
	`totalTracks` integer,
	`totalLength` integer,
	`artworkPath` text,
	FOREIGN KEY (`albumArtistId`) REFERENCES `album_artists`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `artists` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`sortName` text
);
--> statement-breakpoint
CREATE TABLE `discs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`albumId` integer NOT NULL,
	`discNumber` integer NOT NULL,
	`subtitle` text,
	FOREIGN KEY (`albumId`) REFERENCES `albums`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `discs_albumId_discNumber_unique` ON `discs` (`albumId`,`discNumber`);--> statement-breakpoint
CREATE TABLE `media_sources` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`path` text NOT NULL,
	`displayName` text NOT NULL,
	`fileCount` integer DEFAULT 0 NOT NULL,
	`lastUpdated` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `media_sources_path_unique` ON `media_sources` (`path`);--> statement-breakpoint
CREATE TABLE `tracks` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`sourceId` integer NOT NULL,
	`albumId` integer,
	`discId` integer,
	`artistId` integer NOT NULL,
	`title` text NOT NULL,
	`trackNumber` integer,
	`duration` integer,
	`relativePath` text NOT NULL,
	`fileFormat` text,
	`bitrate` integer,
	`sampleRate` integer,
	`modifiedAt` integer,
	`playCount` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`sourceId`) REFERENCES `media_sources`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`albumId`) REFERENCES `albums`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`discId`) REFERENCES `discs`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`artistId`) REFERENCES `artists`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_tracks_source` ON `tracks` (`sourceId`);--> statement-breakpoint
CREATE INDEX `idx_tracks_album` ON `tracks` (`albumId`);--> statement-breakpoint
CREATE INDEX `idx_tracks_disc` ON `tracks` (`discId`);--> statement-breakpoint
CREATE INDEX `idx_tracks_artist` ON `tracks` (`artistId`);--> statement-breakpoint
CREATE INDEX `idx_tracks_album_order` ON `tracks` (`albumId`,`discId`,`trackNumber`);--> statement-breakpoint
CREATE UNIQUE INDEX `tracks_sourceId_relativePath_unique` ON `tracks` (`sourceId`,`relativePath`);