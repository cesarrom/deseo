ALTER TABLE "clients" ALTER COLUMN "ai_model_preference" SET DEFAULT 'openai/gpt-4o';--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN "ai_smart_model" text DEFAULT 'anthropic/claude-3.5-sonnet';--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN "ai_fast_model" text DEFAULT 'openai/gpt-4o-mini';