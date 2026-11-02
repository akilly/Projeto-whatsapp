/** Automação do atendimento (boas-vindas, "estou ocupada", categorias), nomes dos contatos, não lidas, respostas citadas e atualização rápida. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync, readdirSync } from 'node:fs';
import { handleWhatsApp } from '../lib/whatsapp-handler.mjs';
import { EVENTS } from '../lib/whatsapp-domain.mjs';
import { isGreetingOnly, renderTemplate, normalizeConfig, mergeConfig, dueRule, firstName, hasKeyword, withinHours, priorityFor, DEFAULT_RULES } from '../lib/automation.mjs';

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

test('regras puras: saudação, nome, configuração, palavras, horário, prioridade e momento de enviar', () => {
  for (const hello of ['oi', 'Oiii!!', 'Bom dia 😊', 'olá, tudo bem?', 'Boa tarde! Tudo bom com você?', 'e aí, blz?', '']) assert.equal(isGreetingOnly([hello]), true, hello);
  for (const ask of ['oi, quanto custa a escova?', 'Bom dia, tem horário amanhã?', 'quero fazer mechas', 'ardeu muito depois da coloração']) assert.equal(isGreetingOnly([ask]), false, ask);
  assert.equal(renderTemplate('Olá, {nome}! Como posso ajudar?', 'maria souza'), 'Olá, Maria! Como posso ajudar?');
  assert.equal(renderTemplate('Olá, {nome}! Como posso ajudar?', '+5541999999999'), 'Olá! Como posso ajudar?');
  assert.equal(firstName('🌸 Ana'), '');
  assert.ok(hasKeyword(['Qual o ENDEREÇO de vocês?'], ['endereco'])); assert.ok(!hasKeyword(['endereçamento'], ['endereço']));
  // Sábado 10h e domingo 10h em Brasília (13h UTC).
  assert.equal(withinHours('2026-10-31T13:00:00Z', { days: [1, 2, 3, 4, 5, 6], start: '09:00', end: '18:00' }), true);
  assert.equal(withinHours('2026-11-01T13:00:00Z', { days: [1, 2, 3, 4, 5, 6], start: '09:00', end: '18:00' }), false);
  // Configuração antiga (boas-vindas/ocupada fixas) vira regras, e ganha os assuntos de pagamento com prioridade.
  const old = normalizeConfig({ greeting: { enabled: true, delay: 180, text: 'Oi {nome}' }, busy: { enabled: true, delay: 5, text: 'Ocupada' }, categories: [{ name: 'Segurança', color: 'red' }, { name: 'Agendamento urgente', color: 'orange', description: 'Quer horário para hoje ou amanhã.' }, { name: 'Orçamento', color: 'purple' }] });
  assert.deepEqual(old.rules.slice(0, 2).map(r => [r.id, r.enabled, r.delay, r.text]), [['greeting', true, 180, 'Oi {nome}'], ['busy', true, 5, 'Ocupada']]);
  assert.deepEqual(old.categories.map(c => [c.name, c.priority]), [['Segurança', 'alta'], ['Agendamento urgente', 'alta'], ['Orçamento', 'auto'], ['Pagamento pendente', 'alta'], ['Pagamento realizado', 'alta']]);
  assert.match(old.categories[1].description, /até 3 dias/);
  const config = normalizeConfig({ version: 2, rules: [{ id: 'x', name: 'Sem texto', trigger: 'keywords', text: '' }, { trigger: 'category', category: 'Inventado', text: 'Oi' }], categories: [{ name: 'Mechas', color: 'roxo', priority: 'urgente' }] });
  assert.equal(config.rules.length, 1, 'regra sem mensagem é descartada'); assert.equal(config.rules[0].category, 'Mechas');
  assert.deepEqual(config.categories, [{ name: 'Mechas', color: 'gray', priority: 'auto', description: '' }]);
  assert.equal(mergeConfig(normalizeConfig({}), { busy: { enabled: true } }).rules.find(r => r.id === 'busy').enabled, true);
  assert.equal(priorityFor(normalizeConfig({}), 'Pagamento realizado', 'baixa'), 'alta');
  assert.equal(priorityFor(normalizeConfig({}), 'Orçamento', 'baixa'), 'baixa', 'assunto "a IA decide" usa a prioridade da IA');
  const t = { last_direction: 'in', last_inbound: ago(200), ai_at: ago(200), ai_intent: 0, episode_at: ago(300) };
  t.ai_at = t.last_inbound;
  const on = mergeConfig(normalizeConfig({}), { busy: { enabled: true } });
  assert.equal(dueRule(t, on)?.id, 'greeting');
  assert.equal(dueRule({ ...t, last_inbound: ago(30), ai_at: ago(30) }, on), null, 'espera a cliente terminar de escrever');
  assert.equal(dueRule(t, on, Date.now(), { sent: { greeting: ago(100) } }), null, 'uma boas-vindas por atendimento');
  assert.equal(dueRule({ ...t, ai_intent: 1 }, on)?.id, 'busy');
  assert.equal(dueRule({ ...t, ai_intent: 1 }, normalizeConfig({})), null, 'seletor desligado');
  assert.equal(dueRule({ ...t, ai_at: ago(400) }, on), null, 'ainda não leu a última mensagem');
  assert.equal(dueRule({ ...t, last_direction: 'out' }, on), null);
  assert.equal(dueRule({ ...t, ai_category: 'Spam ou suspeita' }, on), null);
  assert.equal(dueRule(t, on, Date.now(), { manualReply: true }), null);
  const rules = normalizeConfig({ version: 2, rules: [{ id: 'end', name: 'Endereço', enabled: true, trigger: 'keywords', keywords: 'endereço, onde fica', text: 'Rua X' }, { id: 'novo', name: 'Novo', enabled: true, trigger: 'first', text: 'Bem-vinda' }] });
  assert.equal(dueRule({ ...t, ai_at: null }, rules, Date.now(), { texts: ['Onde fica o ateliê?'] })?.id, 'end', 'palavras não esperam a IA');
  assert.equal(dueRule({ ...t, ai_at: null }, rules, Date.now(), { texts: ['oi'], first: true })?.id, 'novo');
  assert.equal(dueRule({ ...t, ai_at: null }, rules, Date.now(), { texts: ['oi'] }), null);
  assert.equal(DEFAULT_RULES.find(r => r.id === 'greeting').delay, 120);
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
  assert.equal((await handleWhatsApp(req('automation', 'POST', { rules: DEFAULT_RULES.map(r => r.id === 'busy' ? { ...r, enabled: true, delay: 0 } : r) }), env)).status, 200);
  const r = await sync(env, { events: [message('Oi! Quanto fica mechas?', { secondsAgo: 10 })] });
  assert.equal(r.outbox.length, 1); assert.match(r.outbox[0].text, /^Certo, no momento estou ocupada, assim que estiver disponível te envio uma mensagem\./);
  const t = thread(env);
  assert.equal(t.ai_request, 'Quer orçamento de mechas.'); assert.equal(t.ai_category, 'Orçamento'); assert.equal(t.ai_intent, 1);
  await sync(env, {}); assert.equal(outs(env).length, 1);
  assert.equal(env.AI.calls, 1);
});

test('se a profissional já respondeu no atendimento, a automação não envia nada', async () => {
  const env = await setup();
  await handleWhatsApp(req('automation', 'POST', { rules: DEFAULT_RULES.map(r => r.id === 'busy' ? { ...r, enabled: true, delay: 0 } : r) }), env);
  await sync(env, { events: [message('quero marcar escova', { secondsAgo: 60 }), echo('Oi! Já te respondo.', 50), message('pode ser sábado?', { secondsAgo: 40 })] });
  await sync(env, {}); await sync(env, {});
  assert.deepEqual(outs(env).map(m => m.auto), [null]);
});

test('depois da sua resposta: abertura fica quieta; palavra-chave nova responde; palavra antiga não', async () => {
  const env = await setup();
  const rules = [...DEFAULT_RULES.map(r => r.id === 'busy' ? { ...r, enabled: true, delay: 0 } : r), { id: 'pix', name: 'Pix', enabled: true, trigger: 'keywords', keywords: ['pix'], delay: 0, text: 'A chave Pix é 123.' }];
  await handleWhatsApp(req('automation', 'POST', { rules }), env);
  // Igual ao teste real: pedido, resposta à mão antes da espera, e a cliente volta a escrever.
  await sync(env, { events: [message('oi quero agendar para amanha, aceita pix?', { secondsAgo: 300 }), echo('Oi! Tenho às 15h.', 290)] });
  await sync(env, { events: [message('oi', { secondsAgo: 100 }), message('quero cortar o cabelo', { secondsAgo: 60 })] });
  await sync(env, {});
  assert.deepEqual(outs(env).map(m => m.auto), [null], '"Estou ocupada" e o Pix da mensagem antiga não saem');
  const r = await sync(env, { events: [message('me passa o pix?', { secondsAgo: 0 })] });
  assert.equal(r.outbox[0]?.text, 'A chave Pix é 123.');
  await sync(env, { events: [message('pix de novo?', { secondsAgo: 0 })] }); await sync(env, {});
  assert.equal(outs(env).filter(m => m.auto === 'pix').length, 1, 'uma vez por atendimento');
});

test('sinais internos do celular (chaves, sincronização) não viram mensagem', async () => {
  const env = await setup();
  const n = ++seq;
  await sync(env, { events: [{ id: 'sys-' + n, type: EVENTS[2], whatsappMessage: { id: 'wa-sys-' + n, from: sender, to: client, type: 'unsupported', sendTime: ago(0) } }] });
  assert.equal(env.DB.sqlite.prepare('SELECT count(*) n FROM wa_messages').get().n, 0);
  assert.equal(env.DB.sqlite.prepare('SELECT count(*) n FROM wa_threads').get().n, 0);
});

test('Agendamento antigo ganha a regra dos 3 dias', () => {
  const old = normalizeConfig({ categories: [{ name: 'Agendamento', color: 'blue', priority: 'normal', description: 'Quer marcar, remarcar, cancelar ou saber horários disponíveis.' }] });
  assert.match(old.categories.find(c => c.name === 'Agendamento').description, /Agendamento urgente/);
});

test('painel: regras e assuntos salvos por salão; ligar uma regra não apaga o resto; assunto à mão', async () => {
  const env = await setup();
  const custom = [{ id: 'greeting', name: 'Boas-vindas', enabled: true, trigger: 'greeting', delay: 180, text: 'Oi {nome}, em que posso ajudar?' }, { id: 'end', name: 'Endereço', enabled: false, trigger: 'keywords', keywords: ['endereço'], text: 'Rua X' }];
  const saved = await (await handleWhatsApp(req('automation', 'POST', { rules: custom, categories: [{ name: 'Mechas', color: 'purple', priority: 'alta' }, { name: 'Outros', color: 'gray' }] }), env)).json();
  assert.equal(saved.config.rules[0].delay, 180);
  await handleWhatsApp(req('automation', 'POST', { toggle: { id: 'end', enabled: true } }), env);
  const { config } = await (await handleWhatsApp(req('automation'), env)).json();
  assert.equal(config.rules[1].enabled, true); assert.equal(config.rules[0].text, 'Oi {nome}, em que posso ajudar?'); assert.deepEqual(config.categories.map(c => [c.name, c.priority]), [['Mechas', 'alta'], ['Outros', 'auto']]);
  assert.equal((await (await handleWhatsApp(req('automation', 'GET', null, 'b'), env)).json()).config.rules.find(r => r.id === 'busy').enabled, false, 'cada salão tem a sua');
  await sync(env, { events: [message('oi', { secondsAgo: 1 })] });
  const id = thread(env).id;
  assert.equal((await handleWhatsApp(req('thread/' + id, 'POST', { category: 'Inventada' }), env)).status, 400);
  assert.equal((await handleWhatsApp(req('thread/' + id, 'POST', { category: 'Mechas' }), env)).status, 200);
  assert.equal(thread(env).ai_category, 'Mechas'); assert.equal(thread(env).category_manual, 1);
});

test('regras novas: palavras-chave e assunto respondem; prioridade vem do assunto; nota interna não sai', async () => {
  const env = await setup();
  env.AI = fakeAI({ category: 'Pagamento realizado', priority: 'baixa', reason: 'Mandou comprovante.', request: 'Enviou o comprovante do Pix.', has_request: true });
  const rules = [...DEFAULT_RULES.map(r => r.id === 'paid' ? { ...r, enabled: true, delay: 0 } : r), { id: 'end', name: 'Endereço', enabled: true, trigger: 'keywords', keywords: ['endereço'], delay: 0, text: 'Rua das Flores, 10' }];
  await handleWhatsApp(req('automation', 'POST', { rules }), env);
  let r = await sync(env, { events: [message('Paguei! Segue o comprovante', { secondsAgo: 10 })] });
  assert.equal(r.outbox[0]?.text, 'Recebi, Maria! Obrigada 💜 Vou conferir e já te confirmo.');
  assert.equal(thread(env).ai_priority, 'alta', 'Pagamento realizado é sempre alta');
  r = await sync(env, { events: [message('E qual o endereço?', { secondsAgo: 0 })] });
  assert.equal(r.outbox[0]?.text, 'Rua das Flores, 10');
  await sync(env, {}); assert.equal(outs(env).length, 2, 'cada regra uma vez');
  const id = thread(env).id;
  const note = await (await handleWhatsApp(req('thread/' + id, 'POST', { note: 'Cliente prefere sábado de manhã.' }), env)).json();
  assert.equal(note.message.direction, 'note');
  assert.equal((await sync(env, {})).outbox.length, 0, 'nota não vai para o conector');
  assert.equal((await (await handleWhatsApp(req('thread/' + id), env)).json()).messages.at(-1).body, 'Cliente prefere sábado de manhã.');
  assert.equal((await handleWhatsApp(req('thread/' + id, 'POST', { note: '  ' }), env)).status, 400);
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

test('enviar para um número: começa a conversa (sem virar pendência) ou usa a existente, com ou sem o 9', async () => {
  const env = await setup();
  const form = (to, id, text = 'Oi! Preciso de algumas informações.') => { const f = new FormData(); f.set('requestId', id); f.set('to', to); f.set('name', 'Iasmin Souza'); f.set('text', text); return f; };
  let r = await handleWhatsApp(req('send', 'POST', form('+5541995170049', 'req-numero-123456789')), env);
  assert.equal(r.status, 200);
  let t = thread(env); assert.equal(t.peer, '+5541995170049'); assert.equal(t.name, 'Iasmin Souza'); assert.equal(t.resolved, 1, 'conversa começada pelo ateliê não é pendência');
  assert.equal((await sync(env, {})).outbox[0].to, '+5541995170049');
  // Mesmo número escrito sem o 9: reaproveita a conversa.
  r = await handleWhatsApp(req('send', 'POST', form('+554195170049', 'req-numero-223456789', 'Outra')), env);
  assert.equal(r.status, 200); assert.equal(env.DB.sqlite.prepare('SELECT count(*) n FROM wa_threads').get().n, 1);
  // A resposta da cliente reabre a pendência.
  await sync(env, { events: [{ id: 'resp-1', type: EVENTS[0], whatsappInboundMessage: { id: 'wa-resp-1', from: '+5541995170049', to: sender, type: 'text', text: { body: 'Claro!' }, sendTime: new Date().toISOString() } }] });
  assert.equal(thread(env).resolved, 0);
  assert.equal((await handleWhatsApp(req('send', 'POST', form('123', 'req-numero-323456789')), env)).status, 400);
});
