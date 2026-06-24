CREATE TABLE "repo_config" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"deseo_user_id" uuid NOT NULL,
	"repository" text,
	"branch" text,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "repo_config_deseo_user_id_unique" UNIQUE("deseo_user_id")
);
--> statement-breakpoint
ALTER TABLE "github_tokens" ADD COLUMN "installation_id" text;