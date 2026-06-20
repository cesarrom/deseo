CREATE EXTENSION IF NOT EXISTS vector;--> statement-breakpoint
ALTER TABLE "articles" DROP COLUMN IF EXISTS "embedding";--> statement-breakpoint
ALTER TABLE "articles" ADD COLUMN "embedding" vector(2560);
