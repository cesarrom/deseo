ALTER TABLE "clients" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "articles" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "jobs" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "auth_grants" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "installations" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "client_owner_isolation" ON "clients" AS PERMISSIVE FOR ALL TO public USING (user_id = current_setting('app.current_user_id', true)::uuid) WITH CHECK (user_id = current_setting('app.current_user_id', true)::uuid);--> statement-breakpoint
CREATE POLICY "article_client_isolation" ON "articles" AS PERMISSIVE FOR ALL TO public USING (client_id = current_setting('app.active_client_id', true)::uuid) WITH CHECK (client_id = current_setting('app.active_client_id', true)::uuid);--> statement-breakpoint
CREATE POLICY "job_client_isolation" ON "jobs" AS PERMISSIVE FOR ALL TO public USING (client_id = current_setting('app.active_client_id', true)::uuid) WITH CHECK (client_id = current_setting('app.active_client_id', true)::uuid);--> statement-breakpoint
CREATE POLICY "grant_client_isolation" ON "auth_grants" AS PERMISSIVE FOR ALL TO public USING (client_id = current_setting('app.active_client_id', true)::uuid OR client_id IS NULL) WITH CHECK (client_id = current_setting('app.active_client_id', true)::uuid OR client_id IS NULL);--> statement-breakpoint
CREATE POLICY "installation_client_isolation" ON "installations" AS PERMISSIVE FOR ALL TO public USING (client_id = current_setting('app.active_client_id', true)::uuid OR client_id IS NULL) WITH CHECK (client_id = current_setting('app.active_client_id', true)::uuid OR client_id IS NULL);