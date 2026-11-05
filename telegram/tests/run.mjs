// Teste automate: logica jocului, botul (Worker) și jocul în browser (Playwright, cu Telegram simulat).
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const FO = require(path.join(ROOT, 'core.js'));
const W = await import(path.join(ROOT, 'bot', 'worker.js'));

let passed = 0, failed = 0;
async function test(name, fn) {
  try { await fn(); passed++; console.log('  ok   ' + name); }
  catch (e) { failed++; console.log('  FAIL ' + name + '\n       ' + (e && e.stack || e)); }
}
function assert(c, m) { if (!c) throw new Error(m || 'assert'); }
function eq(a, b, m) { if (a !== b) throw new Error((m || 'eq') + `: ${JSON.stringify(a)} !== ${JSON.stringify(b)}`); }

// ---------------- core ----------------
console.log('core.js');
await test('tap trece ciclic prin inele', () => {
  const r = FO.newRun();
  eq(r.ring, 1); FO.tap(r); eq(r.ring, 2); FO.tap(r); eq(r.ring, 0); FO.tap(r); eq(r.ring, 1);
});
await test('picătura pe inelul curent dă scântei și serie', () => {
  const r = FO.newRun(); r.spawnIn = 99;
  r.items.push({ kind: 'drop', ring: 1, angle: 0.05, drift: 0, ttl: 5 });
  FO.step(r, 0.016, FO.mulberry32(1));
  eq(r.sparks, 1); eq(r.combo, 1); assert(r.events.includes('pick'));
});
await test('picătura pe alt inel nu e culeasă', () => {
  const r = FO.newRun(); r.spawnIn = 99;
  r.items.push({ kind: 'drop', ring: 0, angle: 0.05, drift: 0, ttl: 5 });
  FO.step(r, 0.016, FO.mulberry32(1));
  eq(r.sparks, 0); eq(r.items.length, 1);
});
await test('molia termină tura; scutul o absoarbe o dată', () => {
  const r = FO.newRun({ shield: true }); r.spawnIn = 99;
  r.items.push({ kind: 'moth', ring: 1, angle: 0.02, drift: 0, ttl: 5 });
  FO.step(r, 0.016, FO.mulberry32(1));
  assert(!r.over && !r.shield, 'scutul trebuia consumat');
  r.items.push({ kind: 'moth', ring: 1, angle: r.angle + 0.02, drift: 0, ttl: 5 });
  FO.step(r, 0.016, FO.mulberry32(1));
  assert(r.over, 'trebuia să se termine');
});
await test('continuarea după reclamă merge o singură dată', () => {
  const r = FO.newRun(); r.over = true;
  r.items.push({ kind: 'moth', ring: 1, angle: 0, drift: 0, ttl: 5 });
  assert(FO.revive(r)); assert(!r.over && r.shield && r.items.length === 0);
  r.over = true; assert(!FO.revive(r));
});
await test('simulare 120 s: deterministă, viteza crește și e plafonată', () => {
  function sim() {
    const rng = FO.mulberry32(42), r = FO.newRun();
    let n = 0;
    for (let i = 0; i < 7200 && !r.over; i++) { if (i % 37 === 0) FO.tap(r); FO.step(r, 1 / 60, rng); n++; }
    return [r.score, r.sparks, n, r.speed];
  }
  const a = sim(), b = sim();
  eq(JSON.stringify(a), JSON.stringify(b));
  assert(FO.speedAt(0) < FO.speedAt(30)); assert(FO.speedAt(1000) <= 3.6);
});
await test('apariția nu pune molii direct peste licurici', () => {
  const rng = FO.mulberry32(9);
  for (let i = 0; i < 500; i++) {
    const r = FO.newRun(); r.angle = rng() * FO.TAU;
    r.t = 100; r.spawnIn = 0;
    FO.step(r, 0.001, rng);
    r.items.forEach(it => assert(it.ring !== r.ring || FO.angDist(it.angle, r.angle) > 1, 'prea aproape'));
  }
});
await test('profil: date stricate/ostile sunt curățate', () => {
  const p = FO.parseProfile('{"best":-5,"sparks":"1e3","owned":["skin:mint",5,"x"],"skin":"rose","shields":1e9,"lang":"xx"}');
  eq(p.best, 0); eq(p.sparks, 1000); eq(p.skin, 'amber'); eq(p.shields, 999); eq(p.lang, '');
  assert(p.owned.includes('skin:mint') && p.owned.includes('skin:amber'));
  eq(FO.parseProfile('nu e json').sparks, 0);
});
await test('magazin cu scântei: sărac, cumpără, deja deținut, doar-Stars', () => {
  const p = FO.defaultProfile();
  eq(FO.buySkin(p, 'mint'), 'poor');
  p.sparks = 200; eq(FO.buySkin(p, 'mint'), 'ok'); eq(p.sparks, 50);
  eq(FO.buySkin(p, 'mint'), 'owned'); eq(FO.buySkin(p, 'aurora'), 'stars'); eq(FO.buySkin(p, 'nimic'), 'unknown');
  assert(FO.equipSkin(p, 'mint')); assert(!FO.equipSkin(p, 'violet'));
});
await test('produse Stars: pachete și dublarea scânteilor', () => {
  const p = FO.defaultProfile();
  assert(FO.grantStarItem(p, 'aurora_pack')); assert(FO.owns(p, 'skin:aurora') && FO.owns(p, 'skin:ember'));
  FO.grantStarItem(p, 'shield_pack'); FO.grantStarItem(p, 'shield_pack'); eq(p.shields, 20);
  const run = FO.newRun(); run.sparks = 7; run.score = 50.7;
  eq(FO.finishRun(p, run).earned, 7);
  FO.grantStarItem(p, 'double_sparks'); eq(FO.finishRun(p, run).earned, 14);
  eq(p.best, 50); assert(!FO.grantStarItem(p, 'fals'));
});
await test('cadoul zilnic: o dată pe zi (UTC)', () => {
  const p = FO.defaultProfile(), d1 = new Date('2026-11-04T10:00:00Z'), d2 = new Date('2026-11-05T00:10:00Z');
  eq(FO.claimDaily(p, d1), 50); eq(FO.claimDaily(p, d1), 0); eq(FO.claimDaily(p, d2), 50); eq(p.sparks, 100);
});
await test('limbi: aceleași chei în RO/EN/RU și alegere după cod', () => {
  const k = Object.keys(FO.I18N.en).sort().join();
  eq(Object.keys(FO.I18N.ro).sort().join(), k); eq(Object.keys(FO.I18N.ru).sort().join(), k);
  eq(FO.pickLang('ro-RO'), 'ro'); eq(FO.pickLang('ru'), 'ru'); eq(FO.pickLang('uk'), 'ru'); eq(FO.pickLang('de'), 'en');
});
await test('prețurile Stars sunt identice în joc și în bot', () => {
  for (const id of Object.keys(FO.STAR_ITEMS)) eq(FO.STAR_ITEMS[id].stars, W.ITEMS[id].stars, id);
  eq(Object.keys(FO.STAR_ITEMS).sort().join(), Object.keys(W.ITEMS).sort().join());
});

// ---------------- worker ----------------
console.log('bot/worker.js');
const BOT_TOKEN = '123456:TEST_TOKEN';
function signInitData(user, authDate = Math.floor(Date.now() / 1000), token = BOT_TOKEN) {
  const p = new URLSearchParams({ auth_date: String(authDate), query_id: 'AAE1', user: JSON.stringify(user) });
  const dcs = [...p].map(([k, v]) => k + '=' + v).sort().join('\n');
  const secret = crypto.createHmac('sha256', 'WebAppData').update(token).digest();
  p.set('hash', crypto.createHmac('sha256', secret).update(dcs).digest('hex'));
  return p.toString();
}
function makeEnv() {
  const store = new Map();
  return {
    BOT_TOKEN, WEBHOOK_SECRET: 'sec_abc', GAME_URL: 'https://example.github.io/game/', ALLOWED_ORIGIN: '*',
    PURCHASES: { get: async k => store.get(k) ?? null, put: async (k, v) => { store.set(k, v); } },
    _store: store
  };
}
function fakeTelegram() {
  const calls = [];
  const f = async (url, init) => {
    const method = url.split('/').pop(); const body = JSON.parse(init.body);
    calls.push({ method, body });
    if (method === 'createInvoiceLink') return { json: async () => ({ ok: true, result: 'https://t.me/$inv_' + body.payload.split(':')[0] }) };
    return { json: async () => ({ ok: true, result: true }) };
  };
  f.calls = calls; return f;
}
const USER = { id: 777, first_name: 'Ana', language_code: 'ro' };

await test('initData semnat corect e acceptat', async () => {
  const u = await W.verifyInitData(signInitData(USER), BOT_TOKEN); eq(u.id, 777);
});
await test('initData modificat, alt token sau expirat e respins', async () => {
  const good = signInitData(USER);
  eq(await W.verifyInitData(good.replace('777', '778'), BOT_TOKEN), null);
  eq(await W.verifyInitData(good, '999:OTHER'), null);
  eq(await W.verifyInitData(signInitData(USER, 1000), BOT_TOKEN), null);
  eq(await W.verifyInitData('', BOT_TOKEN), null);
});
await test('/api/invoice creează factură XTR fără provider_token', async () => {
  const env = makeEnv(), f = fakeTelegram();
  const res = await W.handleRequest(new Request('https://w.dev/api/invoice', { method: 'POST', body: JSON.stringify({ initData: signInitData(USER), item: 'double_sparks' }) }), env, f);
  eq(res.status, 200); const j = await res.json(); assert(j.link.includes('double_sparks'));
  const c = f.calls[0]; eq(c.method, 'createInvoiceLink'); eq(c.body.currency, 'XTR'); eq(c.body.provider_token, '');
  eq(c.body.prices[0].amount, 100); assert(c.body.payload.startsWith('double_sparks:777:')); eq(c.body.title, 'Scântei ×2 pentru totdeauna');
  assert(c.body.payload.length <= 128);
});
await test('/api/invoice: fără semnătură 401, produs necunoscut 400', async () => {
  const env = makeEnv(), f = fakeTelegram();
  eq((await W.handleRequest(new Request('https://w.dev/api/invoice', { method: 'POST', body: JSON.stringify({ initData: 'user=x&hash=00', item: 'shield_pack' }) }), env, f)).status, 401);
  eq((await W.handleRequest(new Request('https://w.dev/api/invoice', { method: 'POST', body: JSON.stringify({ initData: signInitData(USER), item: 'gratis' }) }), env, f)).status, 400);
  eq(f.calls.length, 0);
});
await test('pre_checkout: corect acceptat, preț/utilizator greșit respins', async () => {
  const env = makeEnv(), f = fakeTelegram();
  const q = (amount, uid) => ({ pre_checkout_query: { id: 'q1', from: { id: 777, language_code: 'ru' }, currency: 'XTR', total_amount: amount, invoice_payload: `shield_pack:${uid}:n` } });
  await W.handleUpdate(q(25, 777), env, f); eq(f.calls[0].body.ok, true);
  await W.handleUpdate(q(1, 777), env, f); eq(f.calls[1].body.ok, false); eq(f.calls[1].body.error_message, 'Товар больше недоступен.');
  await W.handleUpdate(q(25, 778), env, f); eq(f.calls[2].body.ok, false);
});
await test('successful_payment e salvat o singură dată și apare în /api/purchases', async () => {
  const env = makeEnv(), f = fakeTelegram();
  const upd = { message: { message_id: 5, date: 1, chat: { id: 777 }, from: USER, successful_payment: { currency: 'XTR', total_amount: 50, invoice_payload: 'aurora_pack:777:n', telegram_payment_charge_id: 'ch_1' } } };
  await W.handleUpdate(upd, env, f); await W.handleUpdate(upd, env, f);
  const res = await W.handleRequest(new Request('https://w.dev/api/purchases', { method: 'POST', body: JSON.stringify({ initData: signInitData(USER) }) }), env, f);
  const j = await res.json(); eq(j.items.length, 1); eq(j.items[0].item, 'aurora_pack'); eq(j.items[0].charge, 'ch_1');
});
await test('webhook: cere antetul secret; /start trimite butonul web_app', async () => {
  const env = makeEnv(), f = fakeTelegram();
  const body = JSON.stringify({ message: { message_id: 1, chat: { id: 1 }, from: { id: 1, language_code: 'en' }, text: '/start' } });
  eq((await W.handleRequest(new Request('https://w.dev/webhook/sec_abc', { method: 'POST', body }), env, f)).status, 403);
  const ok = await W.handleRequest(new Request('https://w.dev/webhook/sec_abc', { method: 'POST', body, headers: { 'X-Telegram-Bot-Api-Secret-Token': 'sec_abc' } }), env, f);
  eq(ok.status, 200); eq(f.calls[0].body.reply_markup.inline_keyboard[0][0].web_app.url, env.GAME_URL);
});
await test('/terms și /paysupport răspund (cerință Telegram pentru Stars)', async () => {
  const env = makeEnv(), f = fakeTelegram();
  for (const t of ['/terms', '/paysupport']) await W.handleUpdate({ message: { message_id: 1, chat: { id: 2 }, from: { id: 2, language_code: 'ro' }, text: t } }, env, f);
  assert(f.calls[0].body.text.startsWith('Termeni')); assert(f.calls[1].body.text.startsWith('Suport plăți'));
});
await test('/setup setează webhook cu secret derivat din token, comenzi, buton meniu', async () => {
  const env = makeEnv(); delete env.WEBHOOK_SECRET; const f = fakeTelegram();
  const r = await W.handleRequest(new Request('https://w.dev/setup'), env, f);
  eq(r.status, 200); eq(f.calls.map(c => c.method).join(), 'setWebhook,setMyCommands,setChatMenuButton');
  const sec = await W.webhookSecret(env);
  eq(sec.length, 48); eq(f.calls[0].body.url, 'https://w.dev/webhook/' + sec); eq(f.calls[0].body.secret_token, sec);
  const other = await W.webhookSecret({ BOT_TOKEN: '1:OTHER' }); assert(other !== sec);
  const body = JSON.stringify({ message: { message_id: 1, chat: { id: 1 }, from: { id: 1 }, text: '/terms' } });
  eq((await W.handleRequest(new Request('https://w.dev/webhook/' + sec, { method: 'POST', body, headers: { 'X-Telegram-Bot-Api-Secret-Token': sec } }), env, f)).status, 200);
  eq((await W.handleRequest(new Request('https://w.dev/webhook/gresit', { method: 'POST', body, headers: { 'X-Telegram-Bot-Api-Secret-Token': 'gresit' } }), env, f)).status, 200, 'cale greșită = pagina implicită');
  eq(f.calls.length, 4, 'calea greșită nu trebuie să trimită mesaje');
});

// ---------------- browser ----------------
console.log('browser (Playwright, Telegram simulat)');
let chromium;
try { ({ chromium } = require('playwright')); } catch {
  // În CI, testele de browser sunt obligatorii: lipsa Playwright nu are voie să dea verde.
  if (process.env.CI) { failed++; console.log('  FAIL playwright lipsește în CI'); } else console.log('  skip: playwright lipsește');
}

if (chromium) {
  const API = 'https://api.test';
  const env = makeEnv(), tgFake = fakeTelegram();
  const server = http.createServer((req, res) => {
    const p = req.url.split('?')[0];
    const file = path.join(ROOT, p === '/' ? 'index.html' : p);
    if (!file.startsWith(ROOT) || !fs.existsSync(file)) { res.writeHead(404); return res.end(); }
    const type = file.endsWith('.html') ? 'text/html' : 'application/javascript';
    res.writeHead(200, { 'Content-Type': type + '; charset=utf-8' }); fs.createReadStream(file).pipe(res);
  });
  await new Promise(r => server.listen(0, r));
  const base = `http://127.0.0.1:${server.address().port}/`;
  const browser = await chromium.launch();
  const outDir = path.join(ROOT, 'tests', 'out'); fs.mkdirSync(outDir, { recursive: true });

  async function openPage({ lang = 'ro', config = { API_BASE: API, ADSGRAM_BLOCK_ID: '123' }, adResult = 'done', telegram = true } = {}) {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 780 }, deviceScaleFactor: 2 });
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(String(e)));
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    const initData = signInitData({ ...USER, language_code: lang });
    await page.route('https://telegram.org/js/telegram-web-app.js', r => r.fulfill({ contentType: 'application/javascript', body: telegram ? `
      (function(){
        var cloud = {};
        window.__tgLog = [];
        window.Telegram = { WebApp: {
          initData: ${JSON.stringify(initData)},
          initDataUnsafe: { user: { id: 777, language_code: ${JSON.stringify(lang)} } },
          version: '8.0', isVersionAtLeast: function(){ return true; },
          ready: function(){}, expand: function(){}, setHeaderColor: function(){}, setBackgroundColor: function(){},
          disableVerticalSwipes: function(){}, onEvent: function(){},
          BackButton: { show: function(){}, hide: function(){}, onClick: function(){} },
          HapticFeedback: { impactOccurred: function(){}, notificationOccurred: function(){} },
          CloudStorage: { getItem: function(k, cb){ cb(null, cloud[k] || ''); }, setItem: function(k, v, cb){ cloud[k] = v; cb && cb(null, true); } },
          openInvoice: function(link, cb){ window.__tgLog.push(link); window.__onInvoice(link).then(function(){ cb('paid'); }); }
        } };
      })();` : '' }));
    await page.route('**/config.js', r => r.fulfill({ contentType: 'application/javascript', body: 'window.FO_CONFIG=' + JSON.stringify(config) }));
    await page.route('https://sad.adsgram.ai/js/sad.min.js', r => r.fulfill({ contentType: 'application/javascript', body: `
      window.__adShows = 0;
      window.Adsgram = { init: function(o){ window.__adBlock = o.blockId; return { show: function(){ window.__adShows++;
        return ${adResult === 'done' ? 'Promise.resolve({done:true,state:"destroy",error:false})' : 'Promise.reject({done:false,state:"close",error:false})'}; } }; } };` }));
    // API-ul jocului e servit chiar de worker.js, cu Telegram simulat.
    await page.route(API + '/**', async r => {
      const req = r.request();
      const resp = await W.handleRequest(new Request(req.url(), { method: req.method(), body: req.postData(), headers: req.headers() }), env, tgFake);
      r.fulfill({ status: resp.status, headers: Object.fromEntries(resp.headers), body: await resp.text() });
    });
    // Simulăm plata: Telegram trimite successful_payment către webhook înainte de callback.
    let charge = 0;
    await page.exposeFunction('__onInvoice', async link => {
      const item = link.split('$inv_')[1];
      await W.handleUpdate({ message: { message_id: 9, date: 1, chat: { id: 777 }, from: USER, successful_payment: { currency: 'XTR', total_amount: W.ITEMS[item].stars, invoice_payload: `${item}:777:x`, telegram_payment_charge_id: 'ch_' + (++charge) + '_' + item } } }, env, tgFake);
    });
    await page.goto(base);
    await page.waitForFunction(() => window.__fo);
    return { page, ctx, errors };
  }
  const visible = (page, sel) => page.$eval(sel, el => getComputedStyle(el).display !== 'none' && el.offsetParent !== null);

  await test('meniul pornește în română, fără erori', async () => {
    const { page, ctx, errors } = await openPage({ lang: 'ro' });
    eq(await page.textContent('#menu h1'), 'Orbita licuriciului');
    eq(await page.title(), 'Orbita licuriciului');
    await page.waitForFunction(() => window.__adBlock === '123');
    assert(await visible(page, '#btnDaily'), 'butonul de cadou zilnic trebuia să apară');
    await page.screenshot({ path: path.join(outDir, 'menu-ro.png') });
    eq(errors.length, 0, errors.join('\n')); await ctx.close();
  });
  await test('rusă și engleză după limba din Telegram; comutatorul de limbă merge', async () => {
    let o = await openPage({ lang: 'ru' }); eq(await o.page.textContent('#menu h1'), 'Орбита светлячка'); await o.ctx.close();
    o = await openPage({ lang: 'de' }); eq(await o.page.textContent('#menu h1'), 'Firefly Orbit');
    await o.page.click('#langs [data-lang=ro]'); eq(await o.page.textContent('#btnPlay'), 'Joacă'); await o.ctx.close();
  });
  await test('joc: atingerea schimbă inelul, scorul crește, molia termină tura', async () => {
    const { page, ctx, errors } = await openPage();
    await page.click('#btnPlay');
    const r0 = await page.evaluate(() => window.__fo.run.ring);
    await page.mouse.click(200, 300);
    eq(await page.evaluate(() => window.__fo.run.ring), (r0 + 1) % 3);
    await page.waitForTimeout(700);
    assert(await page.evaluate(() => window.__fo.run.score) > 1);
    await page.screenshot({ path: path.join(outDir, 'play.png') });
    await page.evaluate(() => { const r = window.__fo.run; r.items.push({ kind: 'moth', ring: r.ring, angle: r.angle, drift: 0, ttl: 5 }); });
    await page.waitForSelector('#over.on', { timeout: 3000 });
    assert(await visible(page, '#btnRevive'));
    eq(await page.evaluate(() => window.__fo.profile.runs), 1);
    eq(errors.length, 0, errors.join('\n')); await ctx.close();
  });
  await test('reclamă vizionată: tura continuă o dată, cu scut', async () => {
    const { page, ctx } = await openPage();
    await page.click('#btnPlay');
    await page.evaluate(() => { const r = window.__fo.run; r.items.push({ kind: 'moth', ring: r.ring, angle: r.angle, drift: 0, ttl: 5 }); });
    await page.waitForSelector('#over.on');
    await page.click('#btnRevive');
    await page.waitForFunction(() => !window.__fo.run.over);
    eq(await page.evaluate(() => window.__adShows), 1);
    assert(await page.evaluate(() => window.__fo.run.shield && window.__fo.run.continued));
    eq(await page.evaluate(() => window.__fo.profile.runs), 0, 'tura nu trebuie numărată de două ori');
    await page.evaluate(() => { const r = window.__fo.run; r.shield = false; r.items.push({ kind: 'moth', ring: r.ring, angle: r.angle, drift: 0, ttl: 5 }); });
    await page.waitForSelector('#over.on');
    assert(!(await visible(page, '#btnRevive')), 'a doua continuare nu e permisă');
    await ctx.close();
  });
  await test('reclamă sărită: fără recompensă', async () => {
    const { page, ctx } = await openPage({ adResult: 'skip' });
    await page.click('#btnDaily');
    await page.waitForFunction(() => window.__adShows === 1);
    await page.waitForTimeout(100);
    eq(await page.evaluate(() => window.__fo.profile.sparks), 0);
    await ctx.close();
  });
  await test('cadou zilnic după reclamă: +50 o dată', async () => {
    const { page, ctx } = await openPage();
    await page.click('#btnDaily');
    await page.waitForFunction(() => window.__fo.profile.sparks === 50);
    assert(await page.$eval('#btnDaily', b => b.disabled));
    await ctx.close();
  });
  await test('magazin: culoare cumpărată cu scântei și aleasă', async () => {
    const { page, ctx } = await openPage();
    await page.evaluate(() => { window.__fo.profile.sparks = 200; });
    await page.click('#btnShop');
    await page.screenshot({ path: path.join(outDir, 'shop.png') });
    await page.click('#skinGrid .card:nth-child(2) button');
    eq(await page.evaluate(() => window.__fo.profile.skin), 'mint');
    eq(await page.evaluate(() => window.__fo.profile.sparks), 50);
    await ctx.close();
  });
  await test('Stars: factura trece prin bot, plata ajunge în joc, fără dublare', async () => {
    const { page, ctx, errors } = await openPage();
    await page.click('#btnShop');
    await page.click('#starRows .row:nth-child(2) button');
    await page.waitForFunction(() => window.__fo.profile.owned.includes('perk:double'), null, { timeout: 8000 });
    eq(await page.textContent('#starRows .row:nth-child(2) button'), 'Deținut');
    await page.click('#starRows .row:nth-child(3) button');
    await page.waitForFunction(() => window.__fo.profile.shields === 10, null, { timeout: 8000 });
    await page.click('#btnShopBack');
    await page.reload(); await page.waitForFunction(() => window.__fo);
    await page.waitForTimeout(300);
    eq(await page.evaluate(() => window.__fo.profile.shields), 10, 'după reîncărcare plățile nu se aplică din nou');
    assert(await visible(page, '#btnShield'));
    eq(errors.length, 0, errors.join('\n')); await ctx.close();
  });
  await test('fără bot și fără Adsgram configurate: jocul merge, butoanele plătite sunt ascunse', async () => {
    const { page, ctx, errors } = await openPage({ config: { API_BASE: '', ADSGRAM_BLOCK_ID: '' } });
    assert(!(await visible(page, '#btnDaily')));
    await page.click('#btnShop');
    assert(!(await visible(page, '#starRows')));
    await page.click('#btnShopBack'); await page.click('#btnPlay');
    await page.waitForTimeout(200); assert(await page.evaluate(() => window.__fo.run.score > 0));
    eq(errors.length, 0, errors.join('\n')); await ctx.close();
  });
  await test('în afara Telegram (browser simplu) jocul tot pornește', async () => {
    const { page, ctx, errors } = await openPage({ telegram: false, lang: 'en' });
    await page.click('#btnPlay'); await page.keyboard.press('Space');
    await page.waitForTimeout(200); assert(await page.evaluate(() => window.__fo.run.score > 0));
    eq(errors.length, 0, errors.join('\n')); await ctx.close();
  });

  await browser.close(); server.close();
}

console.log(`\n${passed} trecute, ${failed} picate`);
process.exit(failed ? 1 : 0);
