CREATE TABLE `album_artists` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`sortName` text,
	`musicbrainzArtistId` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `album_artists_name_unique` ON `album_artists` (`name`);--> statement-breakpoint
CREATE TABLE `albums` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`albumArtistId` integer NOT NULL,
	`title` text NOT NULL,
	`sortTitle` text,
	`releaseDate` text,
	`originalDate` text,
	`releaseStatus` text,
	`releaseType` text,
	`label` text,
	`musicbrainzAlbumId` text,
	`musicbrainzReleaseGroupId` text,
	`totalTracks` integer,
	`totalLength` integer,
	`artworkPath` text,
	FOREIGN KEY (`albumArtistId`) REFERENCES `album_artists`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `albums_title_albumArtistId_unique` ON `albums` (`title`,`albumArtistId`);--> statement-breakpoint
CREATE TABLE `artists` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`sortName` text,
	`musicbrainzArtistId` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `artists_name_unique` ON `artists` (`name`);--> statement-breakpoint
CREATE TABLE `discs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`albumId` integer NOT NULL,
	`discNumber` integer NOT NULL,
	`discSubtitle` text,
	FOREIGN KEY (`albumId`) REFERENCES `albums`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `discs_albumId_discNumber_unique` ON `discs` (`albumId`,`discNumber`);--> statement-breakpoint
CREATE TABLE `genres` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `genres_name_unique` ON `genres` (`name`);--> statement-breakpoint
CREATE TABLE `media_sources` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`path` text NOT NULL,
	`displayName` text NOT NULL,
	`fileCount` integer DEFAULT 0 NOT NULL,
	`lastUpdated` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `media_sources_path_unique` ON `media_sources` (`path`);--> statement-breakpoint
CREATE TABLE `track_genres` (
	`trackId` integer NOT NULL,
	`genreId` integer NOT NULL,
	FOREIGN KEY (`trackId`) REFERENCES `tracks`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`genreId`) REFERENCES `genres`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_track_genres_track` ON `track_genres` (`trackId`);--> statement-breakpoint
CREATE INDEX `idx_track_genres_genre` ON `track_genres` (`genreId`);--> statement-breakpoint
CREATE UNIQUE INDEX `track_genres_trackId_genreId_unique` ON `track_genres` (`trackId`,`genreId`);--> statement-breakpoint
CREATE TABLE `tracks` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`sourceId` integer NOT NULL,
	`albumId` integer,
	`discId` integer,
	`artistId` integer NOT NULL,
	`relativePath` text NOT NULL,
	`title` text NOT NULL,
	`sortTitle` text,
	`trackNumber` integer,
	`modifiedAt` integer,
	`container` text NOT NULL,
	`codec` text NOT NULL,
	`channels` integer,
	`durationMs` integer,
	`samples` integer,
	`lossless` integer,
	`bitrateKbps` integer,
	`sampleRateHz` integer,
	`bitDepth` integer,
	`bpm` integer,
	`key` text,
	`replayGainTrackGain` integer,
	`replayGainTrackPeak` integer,
	`replayGainAlbumGain` integer,
	`replayGainAlbumPeak` integer,
	`isrc` text,
	`acoustidId` text,
	`musicbrainzRecordingId` text,
	`musicbrainzTrackId` text,
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