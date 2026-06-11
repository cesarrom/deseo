ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "user_self_access" ON "users" AS PERMISSIVE FOR ALL TO public USING (id = current_setting('app.current_user_id', true)::uuid OR current_setting('app.is_internal', true) = 'true') WITH CHECK (id = current_setting('app.current_user_id', true)::uuid OR current_setting('app.is_internal', true) = 'true');--> statement-breakpoint
ALTER POLICY "article_client_isolation" ON "articles" TO public USING (
        (current_setting('app.active_client_id', true) = '' AND 
         exists (select 1 from clients where id = articles.client_id and user_id = current_setting('app.current_user_id', true)::uuid))
        OR 
        (client_id = current_setting('app.active_client_id', true)::uuid)
      ) WITH CHECK (
        client_id = current_setting('app.active_client_id', true)::uuid
        OR
        exists (select 1 from clients where id = articles.client_id and user_id = current_setting('app.current_user_id', true)::uuid)
      );--> statement-breakpoint
ALTER POLICY "job_client_isolation" ON "jobs" TO public USING (
        (current_setting('app.active_client_id', true) = '' AND 
         exists (select 1 from clients where id = jobs.client_id and user_id = current_setting('app.current_user_id', true)::uuid))
        OR 
        (client_id = current_setting('app.active_client_id', true)::uuid)
      ) WITH CHECK (
        client_id = current_setting('app.active_client_id', true)::uuid
        OR
        exists (select 1 from clients where id = jobs.client_id and user_id = current_setting('app.current_user_id', true)::uuid)
      );--> statement-breakpoint
ALTER POLICY "grant_client_isolation" ON "auth_grants" TO public USING (
        (client_id IS NULL AND user_id = current_setting('app.current_user_id', true)::uuid)
        OR
        (current_setting('app.active_client_id', true) = '' AND 
         exists (select 1 from clients where id = client_id and user_id = current_setting('app.current_user_id', true)::uuid))
        OR 
        (client_id = current_setting('app.active_client_id', true)::uuid)
      ) WITH CHECK (
        (client_id IS NULL AND user_id = current_setting('app.current_user_id', true)::uuid)
        OR
        client_id = current_setting('app.active_client_id', true)::uuid
        OR
        exists (select 1 from clients where id = client_id and user_id = current_setting('app.current_user_id', true)::uuid)
      );--> statement-breakpoint
ALTER POLICY "installation_client_isolation" ON "installations" TO public USING (
        (client_id IS NULL AND user_id = current_setting('app.current_user_id', true)::uuid)
        OR
        (current_setting('app.active_client_id', true) = '' AND 
         exists (select 1 from clients where id = client_id and user_id = current_setting('app.current_user_id', true)::uuid))
        OR 
        (client_id = current_setting('app.active_client_id', true)::uuid)
      ) WITH CHECK (
        (client_id IS NULL AND user_id = current_setting('app.current_user_id', true)::uuid)
        OR
        client_id = current_setting('app.active_client_id', true)::uuid
        OR
        exists (select 1 from clients where id = client_id and user_id = current_setting('app.current_user_id', true)::uuid)
      );