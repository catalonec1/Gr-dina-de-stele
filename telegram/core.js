/* Orbita licuriciului / Firefly Orbit / Орбита светлячка
 * Logica pură a jocului (fără DOM), folosită în browser și în testele Node.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.FO = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var TAU = Math.PI * 2;
  var RINGS = [0.36, 0.58, 0.8];          // raze relative (fracție din jumătatea ecranului)
  var HIT_ANGLE = 0.2;                     // rad: distanța unghiulară pentru coliziune
  var PICK_ANGLE = 0.26;                   // rad: distanța pentru a culege o picătură
  var BASE_SPEED = 1.5;                    // rad/s
  var MAX_SPEED = 3.6;
  var SAVE_VERSION = 1;
  var GOLD_CHANCE = 0.08;                  // din picături, după primele 10 s
  var GOLD_SPARKS = 5;
  var MISSION_REWARD = 25;
  var FREE_DAILY = 25;
  var VERSION = '1.5';
  var MOON_CHANCE = 0.05;                  // v1.2: lună (din picături, după 15 s): încetinește timpul
  var MOON_TIME = 5, MOON_SLOW = 0.6;                     // cadoul zilnic fără reclamă (când Adsgram nu e activ)
  // Misiuni zilnice: 3 pe zi, alese determinist după dată (UTC)
  var MISSION_POOL = [
    { k: 'drops', n: 15 }, { k: 'drops', n: 30 }, { k: 'score', n: 150 }, { k: 'score', n: 300 },
    { k: 'combo', n: 8 }, { k: 'combo', n: 15 }, { k: 'runs', n: 3 }, { k: 'runs', n: 5 }, { k: 'gold', n: 1 }, { k: 'gold', n: 3 }, { k: 'moon', n: 2 },
    { k: 'score', n: 500 }, { k: 'combo', n: 25 }, { k: 'moon', n: 4 }, // v1.4: misiuni grele
    { k: 'gold', n: 5 } // v1.5
  ];

  // Magazin: prețuri în scântei (monedă de joc) sau în Telegram Stars (XTR).
  var SKINS = [
    { id: 'amber',  color: '#ffd166', glow: '#ffb703', price: 0 },
    { id: 'mint',   color: '#7cf5c4', glow: '#2ec4b6', price: 150 },
    { id: 'rose',   color: '#ff8fab', glow: '#fb6f92', price: 300 },
    { id: 'violet', color: '#c8a2ff', glow: '#9d4edd', price: 600 },
    { id: 'frost',  color: '#e0fbfc', glow: '#98c1d9', price: 1000 },
    { id: 'sun',    color: '#fff3b0', glow: '#ff9f1c', price: 2000 },
    { id: 'dusk',   color: '#ffb4a2', glow: '#e5989b', price: 3000 },
    { id: 'jade',   color: '#b5e48c', glow: '#52b69a', price: 4500 },
    { id: 'pine',   color: '#e9fff2', glow: '#74c69d', price: 6000 }, // v1.3: brad de iarnă
    { id: 'lilac',  color: '#f1e4ff', glow: '#b392f0', price: 8000 }, // v1.4: liliac de cristal
    { id: 'copper', color: '#ffc09f', glow: '#d9734e', price: 10000 }, // v1.5: cupru
    { id: 'aurora', color: '#9bf6ff', glow: '#4cc9f0', stars: true },
    { id: 'ember',  color: '#ff9e6d', glow: '#f3722c', stars: true }
  ];
  var STAR_ITEMS = {
    aurora_pack: { stars: 50,  grants: ['skin:aurora', 'skin:ember'] },
    double_sparks: { stars: 100, grants: ['perk:double'] },
    shield_pack: { stars: 25,  grants: ['shields:10'] }
  };

  function mulberry32(seed) {
    var a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      var t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function normAngle(a) { a %= TAU; return a < 0 ? a + TAU : a; }
  function angDist(a, b) {
    var d = Math.abs(normAngle(a) - normAngle(b));
    return d > Math.PI ? TAU - d : d;
  }

  function newRun(opts) {
    opts = opts || {};
    return {
      t: 0,
      ring: 1,
      angle: 0,
      dir: 1,
      speed: BASE_SPEED,
      score: 0,
      sparks: 0,
      combo: 0,
      bestCombo: 0,
      drops: 0,
      golds: 0,
      moons: 0,
      slow: 0,             // v1.2: secunde rămase de timp încetinit
      items: [],             // {kind:'drop'|'moth', ring, angle, drift, ttl}
      spawnIn: 0.6,
      shield: !!opts.shield,
      continued: false,
      over: false,
      jumpFx: 0,
      events: []             // evenimente pentru UI/sunet: 'pick','hit','shield','jump'
    };
  }

  function speedAt(t) { return Math.min(MAX_SPEED, BASE_SPEED + t * 0.03); }

  // Locurile sigure: nu punem o molie direct în fața licuriciului pe inelul lui.
  function spawn(run, rng) {
    var mothChance = Math.min(0.55, 0.28 + run.t * 0.006);
    var kind = rng() < mothChance ? 'moth' : 'drop';
    // v1.1: picătură de aur rară (după 10 s): +5 scântei
    if (kind === 'drop' && run.t > 10 && rng() < GOLD_CHANCE) kind = 'gold';
    else if (kind === 'drop' && run.t > 15 && rng() < MOON_CHANCE) kind = 'moon';
    var ring = Math.floor(rng() * RINGS.length);
    var ahead = 1.4 + rng() * (TAU - 2.5);   // ≥80° în față și ≥63° în spate
    var angle = normAngle(run.angle + run.dir * ahead);
    var drift = kind === 'moth' ? (rng() - 0.5) * 0.6 * Math.min(1, run.t / 40) : 0;
    run.items.push({ kind: kind, ring: ring, angle: angle, drift: drift, ttl: 9 + rng() * 4 });
  }

  function step(run, dt, rng) {
    if (run.over) return run;
    run.events.length = 0;
    run.t += dt;
    if (run.slow > 0) run.slow = Math.max(0, run.slow - dt);
    run.speed = speedAt(run.t) * (run.slow > 0 ? MOON_SLOW : 1);
    run.angle = normAngle(run.angle + run.dir * run.speed * dt);
    run.score += dt * 2;
    if (run.jumpFx > 0) run.jumpFx = Math.max(0, run.jumpFx - dt * 4);

    run.spawnIn -= dt;
    if (run.spawnIn <= 0) {
      spawn(run, rng);
      run.spawnIn = Math.max(0.35, 0.9 - run.t * 0.008) * (0.7 + rng() * 0.6);
    }

    for (var i = run.items.length - 1; i >= 0; i--) {
      var it = run.items[i];
      it.ttl -= dt;
      it.angle = normAngle(it.angle + it.drift * dt);
      if (it.ttl <= 0) { run.items.splice(i, 1); continue; }
      if (it.ring !== run.ring) continue;
      var d = angDist(it.angle, run.angle);
      if ((it.kind === 'drop' || it.kind === 'gold' || it.kind === 'moon') && d < PICK_ANGLE) {
        run.items.splice(i, 1);
        run.combo += 1;
        run.drops += 1;
        run.bestCombo = Math.max(run.bestCombo, run.combo);
        var gain = 1 + Math.floor(run.combo / 5);
        if (it.kind === 'gold') { gain += GOLD_SPARKS; run.golds += 1; run.events.push('gold'); }
        if (it.kind === 'moon') { run.slow = MOON_TIME; run.moons += 1; run.events.push('moon'); }
        run.sparks += gain;
        run.score += 10 * gain;
        run.events.push('pick');
      } else if (it.kind === 'moth' && d < HIT_ANGLE) {
        run.items.splice(i, 1);
        if (run.shield) {
          run.shield = false;
          run.combo = 0;
          run.events.push('shield');
        } else {
          run.over = true;
          run.events.push('hit');
          return run;
        }
      }
    }
    return run;
  }

  // Atingere: licuriciul sare pe inelul următor (spre exterior, apoi revine în centru).
  function tap(run) {
    if (run.over) return run;
    run.ring = (run.ring + 1) % RINGS.length;
    run.jumpFx = 1;
    run.events.push('jump');
    return run;
  }

  // Reclamă vizionată: continuăm o singură dată pe tură, cu molii curățate în jur.
  function revive(run) {
    if (!run.over || run.continued) return false;
    run.over = false;
    run.continued = true;
    run.items = run.items.filter(function (it) { return it.kind !== 'moth'; });
    run.shield = true;
    return true;
  }

  // ---------- Profil și economie ----------
  function defaultProfile() {
    return {
      v: SAVE_VERSION,
      best: 0,
      sparks: 0,
      runs: 0,
      skin: 'amber',
      owned: ['skin:amber'],
      shields: 0,
      lastDaily: '',
      lang: '',
      seen: '',
      missions: null
    };
  }

  function sanitizeProfile(raw) {
    var p = defaultProfile();
    if (!raw || typeof raw !== 'object') return p;
    function num(x) { x = Number(x); return isFinite(x) && x >= 0 ? Math.floor(x) : 0; }
    p.best = num(raw.best);
    p.sparks = num(raw.sparks);
    p.runs = num(raw.runs);
    p.shields = Math.min(999, num(raw.shields));
    if (Array.isArray(raw.owned)) {
      raw.owned.forEach(function (o) {
        if (typeof o === 'string' && o.length < 40 && p.owned.indexOf(o) < 0) p.owned.push(o);
      });
    }
    if (typeof raw.skin === 'string' && p.owned.indexOf('skin:' + raw.skin) >= 0) p.skin = raw.skin;
    if (typeof raw.lastDaily === 'string') p.lastDaily = raw.lastDaily.slice(0, 10);
    if (raw.lang === 'ro' || raw.lang === 'en' || raw.lang === 'ru') p.lang = raw.lang;
    if (typeof raw.seen === 'string') p.seen = raw.seen.slice(0, 10);
    var m = raw.missions;
    if (m && typeof m.day === 'string' && Array.isArray(m.list) && m.list.length === 3) {
      var list = m.list.map(function (q) {
        var base = null;
        for (var i = 0; i < MISSION_POOL.length; i++) if (q && MISSION_POOL[i].k === q.k && MISSION_POOL[i].n === q.n) base = MISSION_POOL[i];
        return base ? { k: base.k, n: base.n, prog: Math.min(base.n, num(q.prog)), claimed: !!q.claimed } : null;
      });
      if (list.every(Boolean)) p.missions = { day: m.day.slice(0, 10), list: list };
    }
    return p;
  }

  function parseProfile(str) {
    try { return sanitizeProfile(JSON.parse(str)); } catch (e) { return defaultProfile(); }
  }

  function owns(p, key) { return p.owned.indexOf(key) >= 0; }

  // ---------- Misiuni zilnice ----------
  function missionsFor(day) {
    var h = 0;
    for (var i = 0; i < day.length; i++) h = (h * 31 + day.charCodeAt(i)) >>> 0;
    var kinds = {}, list = [];
    for (var j = 0; list.length < 3 && j < 60; j++) {
      var q = MISSION_POOL[(h + j * 3) % MISSION_POOL.length];
      if (kinds[q.k]) continue; kinds[q.k] = 1;
      list.push({ k: q.k, n: q.n, prog: 0, claimed: false });
    }
    return list;
  }
  function ensureMissions(p, date) {
    var day = todayKey(date);
    if (!p.missions || p.missions.day !== day) p.missions = { day: day, list: missionsFor(day) };
    return p.missions.list;
  }
  // Progres după o tură: drops/gold se adună, score/combo sunt recorduri pe tură, runs numără ture.
  function trackMissions(p, run, date) {
    var list = ensureMissions(p, date), done = [];
    list.forEach(function (q) {
      if (q.prog >= q.n) return;
      var v = q.k === 'drops' ? q.prog + run.drops : q.k === 'gold' ? q.prog + run.golds : q.k === 'moon' ? q.prog + (run.moons || 0) :
        q.k === 'runs' ? q.prog + 1 : q.k === 'score' ? Math.max(q.prog, Math.floor(run.score)) : Math.max(q.prog, run.bestCombo);
      q.prog = Math.min(q.n, v);
      if (q.prog >= q.n) done.push(q);
    });
    return done;
  }
  function claimMission(p, idx, date) {
    var list = ensureMissions(p, date), q = list[idx];
    if (!q || q.claimed || q.prog < q.n) return 0;
    q.claimed = true; p.sparks += MISSION_REWARD;
    return MISSION_REWARD;
  }

  function finishRun(p, run) {
    var mult = owns(p, 'perk:double') ? 2 : 1;
    var earned = run.sparks * mult;
    var score = Math.floor(run.score);
    p.sparks += earned;
    p.runs += 1;
    var record = score > p.best;
    if (record) p.best = score;
    return { earned: earned, score: score, record: record };
  }

  function skinById(id) {
    for (var i = 0; i < SKINS.length; i++) if (SKINS[i].id === id) return SKINS[i];
    return null;
  }

  // Cumpărare cu scântei. Întoarce un cod: 'ok' | 'owned' | 'poor' | 'stars' | 'unknown'.
  function buySkin(p, id) {
    var s = skinById(id);
    if (!s) return 'unknown';
    if (owns(p, 'skin:' + id)) return 'owned';
    if (s.stars) return 'stars';
    if (p.sparks < s.price) return 'poor';
    p.sparks -= s.price;
    p.owned.push('skin:' + id);
    return 'ok';
  }

  function equipSkin(p, id) {
    if (!owns(p, 'skin:' + id)) return false;
    p.skin = id;
    return true;
  }

  // Aplică un produs plătit în Stars (după confirmarea plății).
  function grantStarItem(p, itemId) {
    var item = STAR_ITEMS[itemId];
    if (!item) return false;
    item.grants.forEach(function (g) {
      if (g.indexOf('shields:') === 0) {
        p.shields = Math.min(999, p.shields + Number(g.split(':')[1]));
      } else if (!owns(p, g)) {
        p.owned.push(g);
      }
    });
    return true;
  }

  function todayKey(date) {
    var d = date || new Date();
    return d.getUTCFullYear() + '-' + String(d.getUTCMonth() + 1).padStart(2, '0') + '-' + String(d.getUTCDate()).padStart(2, '0');
  }

  function canClaimDaily(p, date) { return p.lastDaily !== todayKey(date); }
  function claimDaily(p, date, amount) {
    if (!canClaimDaily(p, date)) return 0;
    amount = amount || 50;
    p.lastDaily = todayKey(date);
    p.sparks += amount;
    return amount;
  }

  // ---------- Texte ----------
  var I18N = {
    ro: {
      title: 'Orbita licuriciului',
      tagline: 'Atinge ca să sari între inele. Culege lumina, ocolește moliile.',
      play: 'Joacă', best: 'Record', sparks: 'Scântei', shop: 'Magazin', back: 'Înapoi',
      score: 'Scor', gameOver: 'Lumina s-a stins', newRecord: 'Record nou!',
      earned: 'Ai strâns {n} scântei', again: 'Din nou', revive: 'Continuă (reclamă)',
      daily: 'Cadou zilnic +50 (reclamă)', dailyDone: 'Cadoul zilnic a fost luat',
      useShield: 'Pornește cu scut ({n})', equip: 'Alege', equipped: 'Ales', buy: 'Cumpără',
      price: '{n} scântei', stars: '{n} ⭐', poor: 'Nu ai destule scântei',
      starsTitle: 'Cu Telegram Stars', packAurora: 'Pachet Aurora + Jar (2 culori)',
      packDouble: 'Scântei ×2 pentru totdeauna', packShield: '10 scuturi',
      thanks: 'Mulțumim! Produsul a fost adăugat.', payFail: 'Plata nu s-a finalizat.',
      noAd: 'Reclama nu e disponibilă acum.', terms: 'Termeni', support: 'Suport',
      termsText: 'Produsele cumpărate cu Stars sunt digitale și se folosesc doar în acest joc. Probleme cu plata: scrie /paysupport botului. Suportul Telegram nu poate ajuta la cumpărăturile din boți.',
      agree: 'Prin cumpărare ești de acord cu Termenii.', owned: 'Deținut', combo: 'Serie ×{n}',
      hint: 'Atinge oriunde',
      dailyFree: 'Cadou zilnic +25', missions: 'Misiunile zilei', claim: 'Ia +{n}', gold: 'Picătură de aur! +5',
      m_drops: 'Culege {n} picături', m_score: 'Fă {n} puncte într-o tură', m_combo: 'Serie de {n}',
      m_runs: 'Joacă {n} ture', m_gold: 'Picături de aur: {n}', mDone: 'Misiune îndeplinită!',
      m_moon: 'Prinde {n} luni', moon: 'Lună! Timpul curge mai încet', whatsNew: 'Noutăți v{n}: culoarea Cupru (10000 scântei) și misiunea: prinde 5 picături de aur'
    },
    en: {
      title: 'Firefly Orbit',
      tagline: 'Tap to hop between rings. Catch the light, dodge the moths.',
      play: 'Play', best: 'Best', sparks: 'Sparks', shop: 'Shop', back: 'Back',
      score: 'Score', gameOver: 'Your light went out', newRecord: 'New record!',
      earned: 'You gathered {n} sparks', again: 'Again', revive: 'Continue (ad)',
      daily: 'Daily gift +50 (ad)', dailyDone: 'Daily gift already claimed',
      useShield: 'Start with shield ({n})', equip: 'Select', equipped: 'Selected', buy: 'Buy',
      price: '{n} sparks', stars: '{n} ⭐', poor: 'Not enough sparks',
      starsTitle: 'With Telegram Stars', packAurora: 'Aurora + Ember pack (2 colors)',
      packDouble: 'Double sparks forever', packShield: '10 shields',
      thanks: 'Thank you! Your item was added.', payFail: 'Payment was not completed.',
      noAd: 'No ad available right now.', terms: 'Terms', support: 'Support',
      termsText: 'Items bought with Stars are digital and only usable in this game. Payment issues: send /paysupport to the bot. Telegram support cannot help with purchases made in bots.',
      agree: 'By purchasing you agree to the Terms.', owned: 'Owned', combo: 'Streak ×{n}',
      hint: 'Tap anywhere',
      dailyFree: 'Daily gift +25', missions: "Today's missions", claim: 'Claim +{n}', gold: 'Golden drop! +5',
      m_drops: 'Catch {n} drops', m_score: 'Score {n} in one run', m_combo: 'Reach a {n} streak',
      m_runs: 'Play {n} runs', m_gold: 'Golden drops: {n}', mDone: 'Mission complete!',
      m_moon: 'Catch {n} moons', moon: 'Moon! Time slows down', whatsNew: 'New in v{n}: the Copper color (10000 sparks) and a new mission: catch 5 golden drops'
    },
    ru: {
      title: 'Орбита светлячка',
      tagline: 'Нажимай, чтобы прыгать между кольцами. Лови свет, избегай мотыльков.',
      play: 'Играть', best: 'Рекорд', sparks: 'Искры', shop: 'Магазин', back: 'Назад',
      score: 'Счёт', gameOver: 'Свет погас', newRecord: 'Новый рекорд!',
      earned: 'Ты собрал {n} искр', again: 'Ещё раз', revive: 'Продолжить (реклама)',
      daily: 'Ежедневный подарок +50 (реклама)', dailyDone: 'Подарок уже получен',
      useShield: 'Начать со щитом ({n})', equip: 'Выбрать', equipped: 'Выбрано', buy: 'Купить',
      price: '{n} искр', stars: '{n} ⭐', poor: 'Не хватает искр',
      starsTitle: 'За Telegram Stars', packAurora: 'Набор Аврора + Уголёк (2 цвета)',
      packDouble: 'Двойные искры навсегда', packShield: '10 щитов',
      thanks: 'Спасибо! Покупка добавлена.', payFail: 'Оплата не завершена.',
      noAd: 'Реклама сейчас недоступна.', terms: 'Условия', support: 'Поддержка',
      termsText: 'Товары за Stars цифровые и используются только в этой игре. Проблемы с оплатой: отправь боту /paysupport. Поддержка Telegram не помогает с покупками в ботах.',
      agree: 'Покупая, ты соглашаешься с Условиями.', owned: 'Есть', combo: 'Серия ×{n}',
      hint: 'Нажми где угодно',
      dailyFree: 'Подарок дня +25', missions: 'Задания дня', claim: 'Забрать +{n}', gold: 'Золотая капля! +5',
      m_drops: 'Собери капель: {n}', m_score: 'Набери {n} очков за забег', m_combo: 'Серия ×{n}',
      m_runs: 'Сыграй забегов: {n}', m_gold: 'Собери золотых капель: {n}', mDone: 'Задание выполнено!',
      m_moon: 'Поймай лун: {n}', moon: 'Луна! Время замедляется', whatsNew: 'Новое в v{n}: цвет «Медь» (10000 искр) и новое задание: поймай 5 золотых капель'
    }
  };

  function pickLang(code) {
    code = String(code || '').toLowerCase();
    if (code.indexOf('ro') === 0 || code.indexOf('mo') === 0) return 'ro';
    if (code.indexOf('ru') === 0 || code.indexOf('uk') === 0 || code.indexOf('be') === 0) return 'ru';
    return 'en';
  }

  function tr(lang, key, n) {
    var dict = I18N[lang] || I18N.en;
    var s = dict[key] != null ? dict[key] : (I18N.en[key] != null ? I18N.en[key] : key);
    return n != null ? s.replace('{n}', n) : s;
  }

  return {
    TAU: TAU, RINGS: RINGS, SKINS: SKINS, STAR_ITEMS: STAR_ITEMS, I18N: I18N,
    HIT_ANGLE: HIT_ANGLE, PICK_ANGLE: PICK_ANGLE,
    mulberry32: mulberry32, normAngle: normAngle, angDist: angDist,
    newRun: newRun, step: step, tap: tap, revive: revive, speedAt: speedAt,
    defaultProfile: defaultProfile, sanitizeProfile: sanitizeProfile, parseProfile: parseProfile,
    owns: owns, finishRun: finishRun, buySkin: buySkin, equipSkin: equipSkin, skinById: skinById,
    grantStarItem: grantStarItem, todayKey: todayKey, canClaimDaily: canClaimDaily, claimDaily: claimDaily,
    pickLang: pickLang, tr: tr,
    VERSION: VERSION, MOON_CHANCE: MOON_CHANCE, MOON_TIME: MOON_TIME, MOON_SLOW: MOON_SLOW,
    MISSION_POOL: MISSION_POOL, MISSION_REWARD: MISSION_REWARD, FREE_DAILY: FREE_DAILY, GOLD_CHANCE: GOLD_CHANCE,
    missionsFor: missionsFor, ensureMissions: ensureMissions, trackMissions: trackMissions, claimMission: claimMission
  };
});
