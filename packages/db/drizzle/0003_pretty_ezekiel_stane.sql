ALTER TABLE "auth_grants" ADD COLUMN "client_id" uuid;--> statement-breakpoint
ALTER TABLE "installations" ADD COLUMN "client_id" uuid;--> statement-breakpoint
ALTER TABLE "auth_grants" ADD CONSTRAINT "auth_grants_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "installations" ADD CONSTRAINT "installations_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clients" DROP COLUMN "payload_instance_url";--> statement-breakpoint
ALTER TABLE "clients" DROP COLUMN "payload_api_key";