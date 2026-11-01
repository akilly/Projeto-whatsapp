/** Automação do atendimento (boas-vindas, "estou ocupada", categorias), nomes dos contatos, não lidas, respostas citadas e atualização rápida. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync, readdirSync } from 'node:fs';
import { handleWhatsApp } from '../lib/whatsapp-handler.mjs';
import { EVENTS } from '../lib/whatsapp-domain.mjs';
import { isGreetingOnly, renderTemplate, normalizeConfig, mergeConfig, dueAutomation, firstName, DEFAULT_CONFIG } from '../lib/automation.mjs';

const master = btoa('1'.repeat(32)), origin = 'https://hanne.test', sender = '+5511999999999', client = '+5541999999999';
const bridgeKey = 'test-bridge-key-12345678901234567890';
function database() {
  const sqlite = new DatabaseSync(':memory:');
  for (const file of readdirSync(new URL('../drizzle/', import.meta.url)).filter(x => x.endsWith('.sql')).sort()) sqlite.exec(readFileSync(new URL('../drizzle/' + file, import.meta.url), 'utf8').replaceAll('--> statement-breakpoint', ''));
  const db = { sqlite, prepare(sql) { return { bind(...args) { return { sql, args, async first() { return sqlite.prepare(sql).get(...args); }, async all() { return { results: sqlite.prepare(sql).all(...args) }; }, async run() { return { meta: { changes: Number(sqlite.prepare(sql).run(...args).changes) } }; } }; } }; }, async batch(ss) { sqlite.exec('BEGIN IMMEDIATE'); try { const r = ss.map(s => ({ meta: { changes: Number(sqlite.prepare(s.sql).run(...s.args).changes) } })); sqlite.exec('COMMIT'); return r; } catch (e) { sqlite.exec('ROLLBACK'); throw e; } } };
  return { DB: db, WHATSAPP_ENCRYPTION_KEY: master, BRIDGE_WAIT_MS: 0, UPDATES_WAIT_MS: 0 };
}
const req = (path, method = 'GET', body = null, user = 'a') => new Request(origin + '/api/whatsapp/' + path, { method, headers: { 'oai-authenticated-user-id': user, Origin: origin, ...(body && !(body instanceof FormData) ? { 'Content-Type': 'application/json' } : {}) }, ...(body ? { body: body instanceof FormData ? body : JSON.stringify(body) } : {}) });
const sync = async (env, body) => (await handleWhatsApp(new Request(origin + '/api/whatsapp/bridge/sync', { method: 'POST', headers: { Authorization: 'Bearer ' + bridgeKey, 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'ready', phone: sender, ...body }) }), env)).json();
const ago = seconds => new Date(Date.now() - seconds * 1000).toISOString();
let seq = 0;
const message = (text, { secondsAgo = 0, name = 'Maria Souza', context } = {}) => { const n = ++seq; return { id: 'in-' + n, type: EVENTS[0], whatsappInboundMessage: { id: 'wa-in-' + n, from: client, to: sender, type: 'text', text: { body: text }, sendTime: ago(secondsAgo), customerProfile: { name }, ...(context ? { context } : {}) } }; };
const echo = (text, secondsAgo = 0) => { const n = ++seq; return { id: 'out-' + n, type: EVENTS[2], whatsappMessage: { id: 'wa-out-' + n, from: sender, to: client, type: 'text', text: { body: text }, sendTime: ago(secondsAgo), customerProfile: { name: client } } }; };
const fakeAI = answer => ({ calls: 0, async run() { this.calls++; return { response: typeof answer === 'function' ? answer() : answer }; } });
async function setup() {
  const env = database();
  assert.equal((await handleWhatsApp(req('connection', 'POST', { provider: 'baileys', bridgeKey }), env)).status, 200);
  await sync(env, { status: 'disconnected', phone: '' });
  await sync(env, {});
  return env;
}
const thread = env => env.DB.sqlite.prepare('SELECT * FROM wa_threads').get();
const outs = env => env.DB.sqlite.prepare("SELECT body,auto,status FROM wa_messages WHERE direction='out' ORDER BY at").all().map(m => ({ ...m }));

test('regras puras: saudação, nome na mensagem, configuração e momento de enviar', () => {
  for (const hello of ['oi', 'Oiii!!', 'Bom dia 😊', 'olá, tudo bem?', 'Boa tarde! Tudo bom com você?', 'e aí, blz?', '']) assert.equal(isGreetingOnly([hello]), true, hello);
  for (const ask of ['oi, quanto custa a escova?', 'Bom dia, tem horário amanhã?', 'quero fazer mechas', 'ardeu muito depois da coloração']) assert.equal(isGreetingOnly([ask]), false, ask);
  assert.equal(renderTemplate('Olá, {nome}! Como posso ajudar?', 'maria souza'), 'Olá, Maria! Como posso ajudar?');
  assert.equal(renderTemplate('Olá, {nome}! Como posso ajudar?', '+5541999999999'), 'Olá! Como posso ajudar?');
  assert.equal(firstName('🌸 Ana'), '');
  const config = normalizeConfig({ greeting: { delay: 5, text: '' }, busy: { enabled: 'sim' }, categories: [{ name: 'Mechas', color: 'roxo' }, { name: 'mechas' }, { name: '' }] });
  assert.equal(config.greeting.delay, 15, 'espera mínima'); assert.equal(config.greeting.text, DEFAULT_CONFIG.greeting.text);
  assert.equal(config.busy.enabled, false); assert.deepEqual(config.categories, [{ name: 'Mechas', color: 'gray', description: '' }]);
  assert.equal(mergeConfig(config, { busy: { enabled: true } }).busy.enabled, true);
  assert.equal(mergeConfig(config, { busy: { enabled: true } }).categories[0].name, 'Mechas', 'alteração parcial não perde as categorias');
  const t = { last_direction: 'in', last_inbound: ago(200), ai_at: ago(200), ai_intent: 0, episode_at: ago(300) };
  t.ai_at = t.last_inbound;
  const on = normalizeConfig({ busy: { enabled: true } });
  assert.equal(dueAutomation(t, on), 'greeting');
  assert.equal(dueAutomation({ ...t, last_inbound: ago(30), ai_at: ago(30) }, on), null, 'espera a cliente terminar de escrever');
  assert.equal(dueAutomation({ ...t, auto_greeted: ago(100) }, on), null, 'uma boas-vindas por atendimento');
  assert.equal(dueAutomation({ ...t, ai_intent: 1 }, on), 'busy');
  assert.equal(dueAutomation({ ...t, ai_intent: 1 }, normalizeConfig({})), null, 'seletor desligado');
  assert.equal(dueAutomation({ ...t, ai_at: ago(400) }, on), null, 'ainda não leu a última mensagem');
  assert.equal(dueAutomation({ ...t, last_direction: 'out' }, on), null);
  assert.equal(dueAutomation({ ...t, ai_category: 'Spam ou suspeita' }, on), null);
});

test('só "oi": depois da espera, envia "Como posso ajudar?" uma vez, com o nome do perfil', async () => {
  const env = await setup();
  await sync(env, { events: [message('Oi, boa tarde!', { secondsAgo: 30 })] });
  assert.equal(outs(env).length, 0, 'ainda dentro da espera de 2 minutos');
  env.DB.sqlite.prepare('UPDATE wa_threads SET last_inbound=?').run(ago(130));
  const r = await sync(env, {});
  assert.equal(r.outbox.length, 1); assert.equal(r.outbox[0].text, 'Olá, Maria! 😊 Como posso ajudar?'); assert.equal(r.outbox[0].to, client);
  assert.deepEqual(outs(env), [{ body: 'Olá, Maria! 😊 Como posso ajudar?', auto: 'greeting', status: 'sending' }]);
  assert.equal(thread(env).ai_intent, 0); assert.equal(thread(env).last_direction, 'out');
  await sync(env, {}); await sync(env, {});
  assert.equal(outs(env).length, 1, 'não repete');
  // A cliente responde só com outro "oi": no mesmo atendimento, nada é enviado de novo.
  await sync(env, { events: [message('oiii', { secondsAgo: 200 })] });
  env.DB.sqlite.prepare('UPDATE wa_threads SET last_inbound=?').run(ago(200));
  await sync(env, {}); await sync(env, {});
  assert.equal(outs(env).length, 1);
});

test('com o pedido e o seletor ligado: lê a solicitação e envia "estou ocupada" uma vez', async () => {
  const env = await setup();
  env.AI = fakeAI({ category: 'Orçamento', priority: 'normal', reason: 'Pede preço.', request: 'Quer orçamento de mechas.', has_request: true });
  assert.equal((await handleWhatsApp(req('automation', 'POST', { busy: { enabled: true, delay: 0 } }), env)).status, 200);
  const r = await sync(env, { events: [message('Oi! Quanto fica mechas?', { secondsAgo: 10 })] });
  assert.equal(r.outbox.length, 1); assert.match(r.outbox[0].text, /^Certo, no momento estou ocupada, assim que estiver disponível te envio uma mensagem\./);
  const t = thread(env);
  assert.equal(t.ai_request, 'Quer orçamento de mechas.'); assert.equal(t.ai_category, 'Orçamento'); assert.equal(t.ai_intent, 1);
  await sync(env, {}); assert.equal(outs(env).length, 1);
  assert.equal(env.AI.calls, 1);
});

test('se a profissional já respondeu no atendimento, a automação não envia nada', async () => {
  const env = await setup();
  await handleWhatsApp(req('automation', 'POST', { busy: { enabled: true, delay: 0 } }), env);
  await sync(env, { events: [message('quero marcar escova', { secondsAgo: 60 }), echo('Oi! Já te respondo.', 50), message('pode ser sábado?', { secondsAgo: 40 })] });
  await sync(env, {}); await sync(env, {});
  assert.deepEqual(outs(env).map(m => m.auto), [null]);
});

test('boas-vindas e "estou ocupada" ficam no painel; salvar parcial não apaga o resto', async () => {
  const env = await setup();
  const saved = await (await handleWhatsApp(req('automation', 'POST', { greeting: { text: 'Oi {nome}, em que posso ajudar?', delay: 180 }, categories: [{ name: 'Mechas', color: 'purple' }, { name: 'Outros', color: 'gray' }] }), env)).json();
  assert.equal(saved.config.greeting.delay, 180);
  await handleWhatsApp(req('automation', 'POST', { busy: { enabled: true } }), env);
  const { config } = await (await handleWhatsApp(req('automation'), env)).json();
  assert.equal(config.busy.enabled, true); assert.equal(config.greeting.text, 'Oi {nome}, em que posso ajudar?'); assert.deepEqual(config.categories.map(c => c.name), ['Mechas', 'Outros']);
  assert.equal((await handleWhatsApp(req('automation', 'GET', null, 'b'), env)).status, 200);
  assert.equal((await (await handleWhatsApp(req('automation', 'GET', null, 'b'), env)).json()).config.busy.enabled, false, 'cada salão tem a sua');
  // Categoria à mão precisa existir na lista e a IA não troca depois.
  await sync(env, { events: [message('oi', { secondsAgo: 1 })] });
  const id = thread(env).id;
  assert.equal((await handleWhatsApp(req('thread/' + id, 'POST', { category: 'Inventada' }), env)).status, 400);
  assert.equal((await handleWhatsApp(req('thread/' + id, 'POST', { category: 'Mechas' }), env)).status, 200);
  assert.equal(thread(env).ai_category, 'Mechas'); assert.equal(thread(env).category_manual, 1);
});

test('nome: salvo no celular, senão o do perfil; eco do celular não troca o nome; não lidas e prévia', async () => {
  const env = await setup();
  await sync(env, { events: [message('Oi', { name: 'Mari ✨' }), message('Tudo bem?', { name: 'Mari ✨' })] });
  let list = await (await handleWhatsApp(req('threads'), env)).json();
  assert.equal(list.threads[0].name, 'Mari ✨'); assert.equal(list.threads[0].unread, 2); assert.equal(list.threads[0].last_preview, 'Tudo bem?');
  await sync(env, { events: [echo('Oi, Mari!')] });
  list = await (await handleWhatsApp(req('threads'), env)).json();
  assert.equal(list.threads[0].name, 'Mari ✨', 'o eco não troca o nome pelo número'); assert.equal(list.threads[0].unread, 0); assert.equal(list.threads[0].last_direction, 'out');
  const r = await sync(env, { contacts: [{ phone: client, name: 'Mariana (cliente)', notify: 'Mari ✨' }, { phone: 'x', name: 'Inválido' }] });
  assert.equal(r.contactsAck, 2);
  list = await (await handleWhatsApp(req('threads'), env)).json();
  assert.equal(list.threads[0].name, 'Mariana (cliente)'); assert.equal(list.threads[0].savedName, 'Mariana (cliente)'); assert.equal(list.threads[0].profileName, 'Mari ✨');
  await sync(env, { events: [message('Oi de novo')] });
  assert.equal(thread(env).unread, 1);
  await handleWhatsApp(req('thread/' + thread(env).id, 'POST', { seen: true }), env);
  assert.equal(thread(env).unread, 0);
});

test('responder citando: a citação vai para o conector e a resposta da cliente aponta a original', async () => {
  const env = await setup();
  await sync(env, { events: [message('Qual o valor da escova?')] });
  const original = env.DB.sqlite.prepare("SELECT id FROM wa_messages WHERE direction='in'").get().id;
  const form = new FormData(); form.set('requestId', 'req-cita-1234567890'); form.set('threadId', thread(env).id); form.set('text', 'R$ 80'); form.set('quoteId', original);
  const sent = await (await handleWhatsApp(req('send', 'POST', form), env)).json();
  assert.equal(sent.message.quoteBody, 'Qual o valor da escova?');
  const r = await sync(env, {});
  assert.deepEqual(r.outbox[0].quote, { id: 'wa-in-' + seq, fromMe: false, text: 'Qual o valor da escova?' });
  await sync(env, { events: [message('Pode ser às 10h?', { context: { id: 'wa-in-' + seq, text: 'Qual o valor da escova?' } })] });
  const reply = env.DB.sqlite.prepare("SELECT quote_id,quote_body FROM wa_messages WHERE body='Pode ser às 10h?'").get();
  assert.equal(reply.quote_id, original); assert.equal(reply.quote_body, 'Qual o valor da escova?');
});

test('atualização rápida: a revisão muda a cada novidade e /updates responde na hora', async () => {
  const env = await setup();
  const before = (await (await handleWhatsApp(req('threads'), env)).json()).rev;
  assert.deepEqual(await (await handleWhatsApp(req('updates?rev=' + before), env)).json(), { rev: before }, 'sem novidade, espera e devolve a mesma');
  await sync(env, { events: [message('Oi')] });
  const after = (await (await handleWhatsApp(req('updates?rev=' + before), env)).json()).rev;
  assert.ok(after > before);
  // O conector v3 espera por envio ou comando; com nada a fazer, volta com intervalo 0 para esperar de novo.
  env.BRIDGE_WAIT_MS = 300; env.BRIDGE_POLL_MS = 20;
  setTimeout(() => env.DB.sqlite.prepare("UPDATE wa_bridge SET command='logout'").run(), 60);
  const waited = await sync(env, { wait: true });
  assert.equal(waited.command, 'logout', 'comando chega durante a espera');
  assert.equal(waited.interval, 0);
});
