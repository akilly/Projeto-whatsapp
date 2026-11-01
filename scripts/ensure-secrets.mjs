/**
 * Garante os segredos do Worker depois do deploy, sem nunca imprimir valores.
 * - WHATSAPP_ENCRYPTION_KEY: gerada uma única vez se ainda não existir (nunca é trocada depois).
 * - SETUP_TOKEN: copiado do ambiente (segredo do GitHub) quando tiver 16+ caracteres.
 * Uso: CLOUDFLARE_API_TOKEN=... [SETUP_TOKEN=...] node scripts/ensure-secrets.mjs
 */
import { spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const wrangler = path.join(root, 'node_modules/wrangler/bin/wrangler.js');
const worker = process.env.WORKER_NAME || 'hanne-essencial';
const env = { ...process.env, WRANGLER_SEND_METRICS: 'false' };

function wr(args, input) {
  const r = spawnSync(process.execPath, [wrangler, ...args], { cwd: root, env, input, encoding: 'utf8' });
  if (r.status !== 0) { console.error((r.stderr || r.stdout || '').replace(/[A-Za-z0-9+/=_-]{24,}/g, '***')); process.exit(r.status || 1); }
  return r.stdout;
}

const list = JSON.parse(wr(['secret', 'list', '--name', worker, '--format', 'json']) || '[]').map(s => s.name);
const put = (name, value) => { wr(['secret', 'put', name, '--name', worker], value); console.log(`Segredo ${name} gravado.`); };

if (!list.includes('WHATSAPP_ENCRYPTION_KEY')) put('WHATSAPP_ENCRYPTION_KEY', randomBytes(32).toString('base64'));
else console.log('WHATSAPP_ENCRYPTION_KEY já existe (mantida).');

const setup = (process.env.SETUP_TOKEN || '').trim();
if (setup.length >= 16) put('SETUP_TOKEN', setup);
else if (!list.includes('SETUP_TOKEN')) console.log('::warning::SETUP_TOKEN não configurado (mínimo 16 caracteres). Sem ele, o primeiro acesso só funciona com e-mail (Brevo).');
