/**
 * Utilitários compartilhados de datas e CSV. Regras de negócio pertencem a domain.js.
 * Referências: docs/DOCUMENTACAO_TECNICA.md.
 */
/**
 * localDate — Retorna AAAA-MM-DD no fuso America/Sao_Paulo, usado como hoje nas regras do negócio.
 */
export const localDate = (d = new Date()) => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
/**
 * dayOffset — Soma dias de calendário a uma data ISO usando meio-dia para evitar viradas próximas da meia-noite.
 */
export const dayOffset = (offset, date = localDate()) => { const d = new Date(date + 'T12:00:00'); d.setDate(d.getDate() + offset); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
/**
 * csvCell — Escapa aspas e neutraliza prefixos de fórmula ao exportar uma célula CSV.
 */
export const csvCell = value => '"' + String(value ?? '').replace(/"/g, '""').replace(/^[=+@\-\t\r]/, "'$&") + '"';
