CREATE TABLE "accounts" (
	"user_id" uuid NOT NULL,
	"type" text NOT NULL,
	"provider" text NOT NULL,
	"provider_account_id" text NOT NULL,
	"refresh_token" text,
	"access_token" text,
	"expires_at" integer,
	"token_type" text,
	"scope" text,
	"id_token" text,
	"session_state" text,
	CONSTRAINT "accounts_provider_provider_account_id_pk" PRIMARY KEY("provider","provider_account_id")
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"session_token" text PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"expires" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text,
	"email" text NOT NULL,
	"email_verified" timestamp,
	"image" text,
	"password_hash" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "verification_tokens" (
	"identifier" text NOT NULL,
	"token" text NOT NULL,
	"expires" timestamp NOT NULL,
	CONSTRAINT "verification_tokens_identifier_token_pk" PRIMARY KEY("identifier","token")
);
--> statement-breakpoint
CREATE TABLE "clients" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"user_id" uuid NOT NULL,
	"ai_model_preference" text DEFAULT 'gpt-4o',
	"custom_data" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "clients_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "clients" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "articles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid NOT NULL,
	"product_id" uuid,
	"title" text NOT NULL,
	"slug" text NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"ast_content" jsonb NOT NULL,
	"target_cms" text,
	"cms_published_id" text,
	"keywords" jsonb,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"published_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "articles" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid NOT NULL,
	"type" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"temporal_workflow_id" text,
	"temporal_run_id" text,
	"input_payload" jsonb,
	"output_payload" jsonb,
	"error_details" text,
	"related_article_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "jobs" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "apps" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"type" text NOT NULL,
	"base_url" text NOT NULL,
	"config_url" text,
	"settings_url" text,
	"webhook_url" text,
	"description" text,
	"icon_url" text,
	"client_id" text NOT NULL,
	"client_secret" text NOT NULL,
	"user_id" uuid NOT NULL,
	"is_published" boolean DEFAULT false NOT NULL,
	"is_internal" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "apps_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "installations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"app_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"client_id" uuid,
	"status" text DEFAULT 'pending' NOT NULL,
	"config" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "installations" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "api_keys" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" text NOT NULL,
	"name" text NOT NULL,
	"user_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"last_used_at" timestamp,
	CONSTRAINT "api_keys_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "performance_metrics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid NOT NULL,
	"product_id" uuid,
	"article_id" uuid,
	"keyword" text,
	"date" timestamp NOT NULL,
	"clicks" integer DEFAULT 0 NOT NULL,
	"impressions" integer DEFAULT 0 NOT NULL,
	"position" real,
	"ctr" real,
	"source" text DEFAULT 'gsc' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "performance_metrics" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "suggestions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid NOT NULL,
	"type" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"context" jsonb,
	"ai_reasoning" text,
	"target_article_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "suggestions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid NOT NULL,
	"name" text NOT NULL,
	"domain" text NOT NULL,
	"type" text DEFAULT 'website' NOT NULL,
	"config" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "products" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clients" ADD CONSTRAINT "clients_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "articles" ADD CONSTRAINT "articles_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "articles" ADD CONSTRAINT "articles_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_related_article_id_articles_id_fk" FOREIGN KEY ("related_article_id") REFERENCES "public"."articles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "apps" ADD CONSTRAINT "apps_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "installations" ADD CONSTRAINT "installations_app_id_apps_id_fk" FOREIGN KEY ("app_id") REFERENCES "public"."apps"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "installations" ADD CONSTRAINT "installations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "installations" ADD CONSTRAINT "installations_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "performance_metrics" ADD CONSTRAINT "performance_metrics_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "performance_metrics" ADD CONSTRAINT "performance_metrics_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "performance_metrics" ADD CONSTRAINT "performance_metrics_article_id_articles_id_fk" FOREIGN KEY ("article_id") REFERENCES "public"."articles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "suggestions" ADD CONSTRAINT "suggestions_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "suggestions" ADD CONSTRAINT "suggestions_target_article_id_articles_id_fk" FOREIGN KEY ("target_article_id") REFERENCES "public"."articles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "articles_client_slug_idx" ON "articles" USING btree ("client_id","slug");--> statement-breakpoint
CREATE UNIQUE INDEX "installation_user_app_client_idx" ON "installations" USING btree ("user_id","app_id","client_id");--> statement-breakpoint
CREATE UNIQUE INDEX "perf_idx" ON "performance_metrics" USING btree ("client_id","product_id","article_id","keyword","date");--> statement-breakpoint
CREATE UNIQUE INDEX "products_client_domain_idx" ON "products" USING btree ("client_id","domain");--> statement-breakpoint
CREATE POLICY "user_self_access" ON "users" AS PERMISSIVE FOR ALL TO public USING (id = NULLIF(current_setting('app.current_user_id', true), '')::uuid OR current_setting('app.is_internal', true) = 'true') WITH CHECK (id = NULLIF(current_setting('app.current_user_id', true), '')::uuid OR current_setting('app.is_internal', true) = 'true');--> statement-breakpoint
CREATE POLICY "client_owner_isolation" ON "clients" AS PERMISSIVE FOR ALL TO public USING ("clients"."user_id" = NULLIF(current_setting('app.current_user_id', true), '')::uuid) WITH CHECK ("clients"."user_id" = NULLIF(current_setting('app.current_user_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "article_client_isolation" ON "articles" AS PERMISSIVE FOR ALL TO public USING (
        (NULLIF(current_setting('app.active_client_id', true), '') IS NULL AND 
         exists (select 1 from clients where id = "articles"."client_id" and user_id = NULLIF(current_setting('app.current_user_id', true), '')::uuid))
        OR 
        ("articles"."client_id" = NULLIF(current_setting('app.active_client_id', true), '')::uuid)
      ) WITH CHECK (
        (NULLIF(current_setting('app.active_client_id', true), '') IS NULL AND 
         exists (select 1 from clients where id = "articles"."client_id" and user_id = NULLIF(current_setting('app.current_user_id', true), '')::uuid))
        OR 
        ("articles"."client_id" = NULLIF(current_setting('app.active_client_id', true), '')::uuid)
      );--> statement-breakpoint
CREATE POLICY "job_client_isolation" ON "jobs" AS PERMISSIVE FOR ALL TO public USING (
        (NULLIF(current_setting('app.active_client_id', true), '') IS NULL AND 
         exists (select 1 from clients where id = "jobs"."client_id" and user_id = NULLIF(current_setting('app.current_user_id', true), '')::uuid))
        OR 
        ("jobs"."client_id" = NULLIF(current_setting('app.active_client_id', true), '')::uuid)
      ) WITH CHECK (
        (NULLIF(current_setting('app.active_client_id', true), '') IS NULL AND 
         exists (select 1 from clients where id = "jobs"."client_id" and user_id = NULLIF(current_setting('app.current_user_id', true), '')::uuid))
        OR 
        ("jobs"."client_id" = NULLIF(current_setting('app.active_client_id', true), '')::uuid)
      );--> statement-breakpoint
CREATE POLICY "installation_client_isolation" ON "installations" AS PERMISSIVE FOR ALL TO public USING (
        ("installations"."client_id" IS NULL AND user_id = NULLIF(current_setting('app.current_user_id', true), '')::uuid)
        OR
        (NULLIF(current_setting('app.active_client_id', true), '') IS NULL AND 
         exists (select 1 from clients where id = "installations"."client_id" and user_id = NULLIF(current_setting('app.current_user_id', true), '')::uuid))
        OR 
        ("installations"."client_id" = NULLIF(current_setting('app.active_client_id', true), '')::uuid)
      ) WITH CHECK (
        ("installations"."client_id" IS NULL AND user_id = NULLIF(current_setting('app.current_user_id', true), '')::uuid)
        OR
        ("installations"."client_id" = NULLIF(current_setting('app.active_client_id', true), '')::uuid)
        OR
        exists (select 1 from clients where id = "installations"."client_id" and user_id = NULLIF(current_setting('app.current_user_id', true), '')::uuid)
      );--> statement-breakpoint
CREATE POLICY "performance_client_isolation" ON "performance_metrics" AS PERMISSIVE FOR ALL TO public USING (
        (NULLIF(current_setting('app.active_client_id', true), '') IS NULL AND 
         exists (select 1 from clients where id = "performance_metrics"."client_id" and user_id = NULLIF(current_setting('app.current_user_id', true), '')::uuid))
        OR 
        ("performance_metrics"."client_id" = NULLIF(current_setting('app.active_client_id', true), '')::uuid)
      ) WITH CHECK (
        (NULLIF(current_setting('app.active_client_id', true), '') IS NULL AND 
         exists (select 1 from clients where id = "performance_metrics"."client_id" and user_id = NULLIF(current_setting('app.current_user_id', true), '')::uuid))
        OR 
        ("performance_metrics"."client_id" = NULLIF(current_setting('app.active_client_id', true), '')::uuid)
      );--> statement-breakpoint
CREATE POLICY "suggestion_client_isolation" ON "suggestions" AS PERMISSIVE FOR ALL TO public USING (
        (NULLIF(current_setting('app.active_client_id', true), '') IS NULL AND 
         exists (select 1 from clients where id = "suggestions"."client_id" and user_id = NULLIF(current_setting('app.current_user_id', true), '')::uuid))
        OR 
        ("suggestions"."client_id" = NULLIF(current_setting('app.active_client_id', true), '')::uuid)
      ) WITH CHECK (
        (NULLIF(current_setting('app.active_client_id', true), '') IS NULL AND 
         exists (select 1 from clients where id = "suggestions"."client_id" and user_id = NULLIF(current_setting('app.current_user_id', true), '')::uuid))
        OR 
        ("suggestions"."client_id" = NULLIF(current_setting('app.active_client_id', true), '')::uuid)
      );--> statement-breakpoint
CREATE POLICY "product_client_isolation" ON "products" AS PERMISSIVE FOR ALL TO public USING (
        (NULLIF(current_setting('app.active_client_id', true), '') IS NULL AND 
         exists (select 1 from clients where id = "products"."client_id" and user_id = NULLIF(current_setting('app.current_user_id', true), '')::uuid))
        OR 
        ("products"."client_id" = NULLIF(current_setting('app.active_client_id', true), '')::uuid)
      ) WITH CHECK (
        (NULLIF(current_setting('app.active_client_id', true), '') IS NULL AND 
         exists (select 1 from clients where id = "products"."client_id" and user_id = NULLIF(current_setting('app.current_user_id', true), '')::uuid))
        OR 
        ("products"."client_id" = NULLIF(current_setting('app.active_client_id', true), '')::uuid)
      );