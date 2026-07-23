CREATE TABLE `match_turns` (
	`id` int AUTO_INCREMENT NOT NULL,
	`matchId` varchar(12) NOT NULL,
	`turnNumber` int NOT NULL,
	`submittedByUserId` int NOT NULL,
	`state` longtext NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `match_turns_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `matches` (
	`id` varchar(12) NOT NULL,
	`hostUserId` int NOT NULL,
	`guestUserId` int,
	`hostName` varchar(40) NOT NULL,
	`guestName` varchar(40),
	`seed` int NOT NULL,
	`preset` varchar(20) NOT NULL,
	`size` int NOT NULL,
	`hostTribe` int NOT NULL,
	`guestTribe` int NOT NULL,
	`status` enum('open','active','finished','abandoned') NOT NULL DEFAULT 'open',
	`turnNumber` int NOT NULL DEFAULT 0,
	`currentUserId` int,
	`winnerUserId` int,
	`resultText` varchar(200),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `matches_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `profiles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`commanderName` varchar(40) NOT NULL DEFAULT 'Commander',
	`games` int NOT NULL DEFAULT 0,
	`wins` int NOT NULL DEFAULT 0,
	`bestScore` int NOT NULL DEFAULT 0,
	`duelsWon` int NOT NULL DEFAULT 0,
	`campsRazed` int NOT NULL DEFAULT 0,
	`battlesWon` int NOT NULL DEFAULT 0,
	`heroesLost` int NOT NULL DEFAULT 0,
	`highestHeroLevel` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `profiles_id` PRIMARY KEY(`id`),
	CONSTRAINT `profiles_userId_unique` UNIQUE(`userId`)
);
