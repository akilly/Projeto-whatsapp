-- Automação em regras: qual mensagem automática (regra) já saiu em cada conversa e quando. Uma vez por atendimento.
CREATE TABLE wa_auto_sent (thread_id TEXT NOT NULL, rule_id TEXT NOT NULL, at TEXT NOT NULL, PRIMARY KEY (thread_id, rule_id));
--> statement-breakpoint
-- Notas internas dentro da conversa do WhatsApp (nunca enviadas à cliente).
CREATE INDEX wa_messages_notes ON wa_messages (thread_id, direction);
