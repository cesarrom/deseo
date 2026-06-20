CREATE TABLE "github_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"deseo_user_id" uuid NOT NULL,
	"access_token" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "github_tokens_deseo_user_id_unique" UNIQUE("deseo_user_id")
);
