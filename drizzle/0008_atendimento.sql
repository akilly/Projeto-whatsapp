-- Atendimento no estilo WhatsApp: nomes dos contatos, solicitação atual da cliente, não lidas, respostas citadas,
-- automação (boas-vindas e "estou ocupada") e um contador de novidades que a tela acompanha para atualizar na hora.
ALTER TABLE wa_threads ADD COLUMN push_name TEXT;
--> statement-breakpoint
ALTER TABLE wa_threads ADD COLUMN ai_request TEXT;
--> statement-breakpoint
ALTER TABLE wa_threads ADD COLUMN ai_intent INTEGER;
--> statement-breakpoint
ALTER TABLE wa_threads ADD COLUMN category_manual INTEGER NOT NULL DEFAULT 0;
--> statement-breakpoint
ALTER TABLE wa_threads ADD COLUMN unread INTEGER NOT NULL DEFAULT 0;
--> statement-breakpoint
ALTER TABLE wa_threads ADD COLUMN last_preview TEXT;
--> statement-breakpoint
ALTER TABLE wa_threads ADD COLUMN last_direction TEXT;
--> statement-breakpoint
ALTER TABLE wa_threads ADD COLUMN last_status TEXT;
--> statement-breakpoint
ALTER TABLE wa_threads ADD COLUMN episode_at TEXT;
--> statement-breakpoint
ALTER TABLE wa_threads ADD COLUMN auto_greeted TEXT;
--> statement-breakpoint
ALTER TABLE wa_threads ADD COLUMN auto_busy TEXT;
--> statement-breakpoint
ALTER TABLE wa_messages ADD COLUMN auto TEXT;
--> statement-breakpoint
ALTER TABLE wa_messages ADD COLUMN quote_id TEXT;
--> statement-breakpoint
ALTER TABLE wa_messages ADD COLUMN quote_body TEXT;
--> statement-breakpoint
ALTER TABLE wa_outbox ADD COLUMN quote TEXT;
--> statement-breakpoint
ALTER TABLE wa_connections ADD COLUMN rev INTEGER NOT NULL DEFAULT 0;
--> statement-breakpoint
CREATE TABLE wa_contacts (channel_id TEXT NOT NULL, peer TEXT NOT NULL, name TEXT, push_name TEXT, updated_at INTEGER NOT NULL, PRIMARY KEY (channel_id, peer));
--> statement-breakpoint
CREATE TABLE wa_automation (user_id TEXT PRIMARY KEY NOT NULL, config TEXT NOT NULL, updated_at INTEGER NOT NULL);
