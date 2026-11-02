/** Envio de e-mail pelo Brevo: opções aceitas pelo runtime da Cloudflare e erros com motivo. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { sendMail, accessEmail, mailEnabled } from '../lib/mailer.mjs';

const env = { BREVO_API_KEY: 'x'.repeat(40), MAIL_FROM: 'remetente@exemplo.com', MAIL_FROM_NAME: 'Hanne' };

test('pedido ao Brevo usa só opções que o Workers aceita (redirect "error" derruba todo envio)', async () => {
  let seen;
  const fetcher = async (url, options) => { seen = { url, options }; return new Response('{}', { status: 201 }); };
  assert.equal(mailEnabled(env), true);
  await sendMail(env, 'cliente@exemplo.com', accessEmail('invite', 'https://site/login?acesso=abc', 10080), fetcher);
  assert.ok(['follow', 'manual'].includes(seen.options.redirect), 'Workers só aceita follow ou manual');
  const body = JSON.parse(seen.options.body);
  assert.equal(body.sender.email, 'remetente@exemplo.com'); assert.equal(body.to[0].email, 'cliente@exemplo.com'); assert.match(body.htmlContent, /acesso=abc/);
});

test('recusa do Brevo vira erro com o código, sem a chave', async () => {
  await assert.rejects(sendMail(env, 'cliente@exemplo.com', { subject: 's', text: 't' }, async () => new Response('{}', { status: 401 })), e => e.message === 'mail_rejected_401' && !e.message.includes(env.BREVO_API_KEY));
});
