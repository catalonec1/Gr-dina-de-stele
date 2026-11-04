/* Botul jocului ca Cloudflare Worker (plan gratuit).
 * - POST /webhook/<WEBHOOK_SECRET> : update-uri de la Telegram (/start, /terms, /paysupport, plăți Stars)
 * - POST /api/invoice   {initData, item} -> {link}   (factură în Stars, valută XTR)
 * - POST /api/purchases {initData}       -> {items:[{item, charge}]}
 * - GET  /setup                         : setează webhook-ul, comenzile și butonul de meniu (idempotent)
 * Variabile: BOT_TOKEN (singurul secret), GAME_URL, ALLOWED_ORIGIN, OWNER_CHAT_ID (opțional); KV: PURCHASES
 * Secretul webhook-ului se derivă din token (SHA-256), deci nu trebuie configurat separat.
 */

export const ITEMS = {
  aurora_pack:   { stars: 50,  title: { en: 'Aurora + Ember pack', ro: 'Pachet Aurora + Jar', ru: 'Набор Аврора + Уголёк' } },
  double_sparks: { stars: 100, title: { en: 'Double sparks forever', ro: 'Scântei ×2 pentru totdeauna', ru: 'Двойные искры навсегда' } },
  shield_pack:   { stars: 25,  title: { en: '10 shields', ro: '10 scuturi', ru: '10 щитов' } }
};

const TEXT = {
  start: {
    en: 'Firefly Orbit: tap to hop between rings, catch the light and dodge the moths. Press the button to play.',
    ro: 'Orbita licuriciului: atinge ca să sari între inele, culege lumina și ocolește moliile. Apasă butonul ca să joci.',
    ru: 'Орбита светлячка: нажимай, чтобы прыгать между кольцами, лови свет и избегай мотыльков. Нажми кнопку, чтобы играть.'
  },
  play: { en: 'Play', ro: 'Joacă', ru: 'Играть' },
  terms: {
    en: 'Terms: items bought with Telegram Stars are digital goods usable only inside Firefly Orbit. They are delivered right after payment. If an item does not arrive or you were charged by mistake, send /paysupport and describe the problem; refunds are reviewed case by case. Telegram support cannot help with purchases made in bots. By buying you agree to these terms.',
    ro: 'Termeni: produsele cumpărate cu Telegram Stars sunt bunuri digitale care se folosesc doar în Orbita licuriciului. Le primești imediat după plată. Dacă un produs nu a apărut sau ai plătit din greșeală, trimite /paysupport și descrie problema; rambursările se analizează pe rând. Suportul Telegram nu poate ajuta la cumpărăturile din boți. Prin cumpărare ești de acord cu acești termeni.',
    ru: 'Условия: товары за Telegram Stars являются цифровыми и используются только в «Орбите светлячка». Они выдаются сразу после оплаты. Если товар не пришёл или оплата была ошибочной, отправь /paysupport и опиши проблему; возвраты рассматриваются индивидуально. Поддержка Telegram не помогает с покупками в ботах. Покупая, ты соглашаешься с этими условиями.'
  },
  paysupport: {
    en: 'Payment support: reply to this message with what you bought and what went wrong. We answer here in the chat. Telegram support cannot help with purchases made in bots.',
    ro: 'Suport plăți: răspunde la acest mesaj cu ce ai cumpărat și ce nu a mers. Îți răspundem aici, în chat. Suportul Telegram nu poate ajuta la cumpărăturile din boți.',
    ru: 'Поддержка оплаты: ответь на это сообщение, что ты купил и что пошло не так. Мы ответим здесь, в чате. Поддержка Telegram не помогает с покупками в ботах.'
  },
  thanks: { en: 'Thank you! Your item is ready in the game.', ro: 'Mulțumim! Produsul te așteaptă în joc.', ru: 'Спасибо! Покупка уже в игре.' },
  badItem: { en: 'This item is no longer available.', ro: 'Produsul nu mai este disponibil.', ru: 'Товар больше недоступен.' },
  received: { en: 'Message received, we will reply here.', ro: 'Mesaj primit, îți răspundem aici.', ru: 'Сообщение получено, ответим здесь.' }
};

export function langOf(code) {
  code = String(code || '').toLowerCase();
  if (code.startsWith('ro') || code.startsWith('mo')) return 'ro';
  if (code.startsWith('ru') || code.startsWith('uk') || code.startsWith('be')) return 'ru';
  return 'en';
}

const enc = new TextEncoder();
async function hmac(key, data) {
  const k = await crypto.subtle.importKey('raw', typeof key === 'string' ? enc.encode(key) : key,
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return new Uint8Array(await crypto.subtle.sign('HMAC', k, enc.encode(data)));
}
// Secretul webhook-ului: primii 48 de caractere hex din SHA-256("webhook:" + token).
export async function webhookSecret(env) {
  if (env.WEBHOOK_SECRET) return env.WEBHOOK_SECRET;
  const d = await crypto.subtle.digest('SHA-256', enc.encode('webhook:' + env.BOT_TOKEN));
  return hex(new Uint8Array(d)).slice(0, 48);
}
function hex(buf) { return Array.from(buf, b => b.toString(16).padStart(2, '0')).join(''); }
function safeEqual(a, b) {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

// Verifică Telegram.WebApp.initData după algoritmul oficial (HMAC-SHA256 cu cheia "WebAppData").
export async function verifyInitData(initData, botToken, maxAgeSec = 86400, nowSec = Math.floor(Date.now() / 1000)) {
  if (!initData || typeof initData !== 'string') return null;
  const params = new URLSearchParams(initData);
  const hash = params.get('hash');
  if (!hash) return null;
  params.delete('hash');
  const pairs = [];
  for (const [k, v] of params) pairs.push(k + '=' + v);
  pairs.sort();
  const secret = await hmac('WebAppData', botToken);
  const calc = hex(await hmac(secret, pairs.join('\n')));
  if (!safeEqual(calc, hash)) return null;
  const authDate = Number(params.get('auth_date') || 0);
  if (!authDate || nowSec - authDate > maxAgeSec) return null;
  try { return JSON.parse(params.get('user') || 'null'); } catch { return null; }
}

function tgApi(env, method, body, fetchImpl = fetch) {
  return fetchImpl(`https://api.telegram.org/bot${env.BOT_TOKEN}/${method}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
  }).then(r => r.json());
}

function cors(env, res) {
  const h = new Headers(res.headers);
  h.set('Access-Control-Allow-Origin', env.ALLOWED_ORIGIN || '*');
  h.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  h.set('Access-Control-Allow-Headers', 'Content-Type');
  return new Response(res.body, { status: res.status, headers: h });
}
const json = (obj, status = 200) => new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json' } });

async function getPurchases(env, userId) {
  const raw = await env.PURCHASES.get('u:' + userId);
  return raw ? JSON.parse(raw) : [];
}

export async function handleUpdate(update, env, fetchImpl = fetch) {
  const call = (m, b) => tgApi(env, m, b, fetchImpl);

  if (update.pre_checkout_query) {
    const q = update.pre_checkout_query;
    const [item, uid] = String(q.invoice_payload || '').split(':');
    const def = ITEMS[item];
    const ok = !!def && q.currency === 'XTR' && q.total_amount === def.stars && String(q.from.id) === uid;
    const body = { pre_checkout_query_id: q.id, ok };
    if (!ok) body.error_message = TEXT.badItem[langOf(q.from.language_code)];
    return call('answerPreCheckoutQuery', body);
  }

  const msg = update.message;
  if (!msg) return null;
  const lang = langOf(msg.from && msg.from.language_code);

  if (msg.successful_payment) {
    const sp = msg.successful_payment;
    const [item] = String(sp.invoice_payload || '').split(':');
    const list = await getPurchases(env, msg.from.id);
    if (!list.some(p => p.charge === sp.telegram_payment_charge_id)) {
      list.push({ item, charge: sp.telegram_payment_charge_id, stars: sp.total_amount, at: msg.date });
      await env.PURCHASES.put('u:' + msg.from.id, JSON.stringify(list));
    }
    return call('sendMessage', { chat_id: msg.chat.id, text: TEXT.thanks[lang] });
  }

  const text = String(msg.text || '').trim();
  const cmd = text.split(/\s|@/)[0].toLowerCase();
  if (cmd === '/start' || cmd === '/play') {
    return call('sendMessage', {
      chat_id: msg.chat.id, text: TEXT.start[lang],
      reply_markup: { inline_keyboard: [[{ text: TEXT.play[lang], web_app: { url: env.GAME_URL } }]] }
    });
  }
  if (cmd === '/terms') return call('sendMessage', { chat_id: msg.chat.id, text: TEXT.terms[lang] });
  if (cmd === '/paysupport' || cmd === '/support') return call('sendMessage', { chat_id: msg.chat.id, text: TEXT.paysupport[lang] });

  // Orice alt mesaj îl trimitem proprietarului (dacă OWNER_CHAT_ID e setat), ca să poată răspunde.
  if (env.OWNER_CHAT_ID && String(msg.chat.id) !== String(env.OWNER_CHAT_ID)) {
    await call('forwardMessage', { chat_id: env.OWNER_CHAT_ID, from_chat_id: msg.chat.id, message_id: msg.message_id });
    return call('sendMessage', { chat_id: msg.chat.id, text: TEXT.received[lang] });
  }
  return null;
}

export async function handleRequest(request, env, fetchImpl = fetch) {
  const url = new URL(request.url);

  if (request.method === 'OPTIONS') return cors(env, new Response(null, { status: 204 }));

  const secret = await webhookSecret(env);
  if (request.method === 'POST' && url.pathname === '/webhook/' + secret) {
    if (request.headers.get('X-Telegram-Bot-Api-Secret-Token') !== secret) return new Response('forbidden', { status: 403 });
    const update = await request.json();
    await handleUpdate(update, env, fetchImpl);
    return new Response('ok');
  }

  if (request.method === 'POST' && (url.pathname === '/api/invoice' || url.pathname === '/api/purchases')) {
    let body;
    try { body = await request.json(); } catch { return cors(env, json({ error: 'bad json' }, 400)); }
    const user = await verifyInitData(body.initData, env.BOT_TOKEN);
    if (!user || !user.id) return cors(env, json({ error: 'unauthorized' }, 401));

    if (url.pathname === '/api/purchases') {
      const list = await getPurchases(env, user.id);
      return cors(env, json({ items: list.map(p => ({ item: p.item, charge: p.charge })) }));
    }

    const def = ITEMS[body.item];
    if (!def) return cors(env, json({ error: 'unknown item' }, 400));
    const lang = langOf(user.language_code);
    const nonce = Math.random().toString(36).slice(2, 10);
    const res = await tgApi(env, 'createInvoiceLink', {
      title: def.title[lang],
      description: def.title[lang],
      payload: `${body.item}:${user.id}:${nonce}`,
      provider_token: '',
      currency: 'XTR',
      prices: [{ label: def.title[lang], amount: def.stars }]
    }, fetchImpl);
    if (!res.ok) return cors(env, json({ error: 'telegram' }, 502));
    return cors(env, json({ link: res.result }));
  }

  if (request.method === 'GET' && url.pathname === '/setup') {
    if (!env.BOT_TOKEN) return json({ error: 'BOT_TOKEN lipsește' }, 500);
    const hook = `${url.origin}/webhook/${secret}`;
    const out = {};
    out.webhook = await tgApi(env, 'setWebhook', {
      url: hook, secret_token: secret, allowed_updates: ['message', 'pre_checkout_query']
    }, fetchImpl);
    const cmds = [
      { command: 'play', description: 'Play / Joacă / Играть' },
      { command: 'terms', description: 'Terms / Termeni / Условия' },
      { command: 'paysupport', description: 'Payment support / Suport plăți' }
    ];
    out.commands = await tgApi(env, 'setMyCommands', { commands: cmds }, fetchImpl);
    out.menu = await tgApi(env, 'setChatMenuButton', {
      menu_button: { type: 'web_app', text: 'Play', web_app: { url: env.GAME_URL } }
    }, fetchImpl);
    return json(out);
  }

  return new Response('Firefly Orbit bot', { status: 200 });
}

export default {
  fetch(request, env) { return handleRequest(request, env); }
};
