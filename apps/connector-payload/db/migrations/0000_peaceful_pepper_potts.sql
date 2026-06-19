CREATE TABLE "payload_configs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"deseo_user_id" uuid NOT NULL,
	"instance_url" text NOT NULL,
	"api_key" text NOT NULL,
	"collection" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "deseo_user_id_idx" ON "payload_configs" USING btree ("deseo_user_id");