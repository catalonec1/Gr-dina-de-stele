#!/usr/bin/env node
// Generator static: site de referință pentru erorile ORA-/PLS-.
// Folosire: node ora/build.js [dir-ieșire]   (implicit dist/web/ora)
// Sursa datelor: ora/errors.tsv (aceeași listă ca în pluginul ORA Error Helper).
'use strict';
const fs = require('fs');
const path = require('path');

const OUT = path.resolve(process.argv[2] || path.join(__dirname, '..', 'dist', 'web', 'ora'));
const BASE = 'https://catalonec1.github.io/Gr-dina-de-stele/ora/';
const TODAY = new Date().toISOString().slice(0, 10);
const LINKS = {
  lint: 'https://plugins.jetbrains.com/plugin/35825-pl-sql-lint',
  helper: 'https://plugins.jetbrains.com/plugin/35912-ora-error-helper',
  plan: 'https://plugins.jetbrains.com/plugin/35913-oracle-plan-reader',
  book: 'https://www.amazon.com/s?k=%22PL%2FSQL+in+Practice%22&i=digital-text',
};

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const num = code => parseInt(code.split('-')[1], 10);

function load() {
  const rows = fs.readFileSync(path.join(__dirname, 'errors.tsv'), 'utf8').split(/\r?\n/).filter(Boolean);
  const list = rows.map((r, i) => {
    const c = r.split('\t');
    if (c.length !== 5 || !/^(ORA|PLS)-\d{5}$/.test(c[0])) throw new Error('rând invalid ' + (i + 1));
    return { code: c[0], title: c[2], cause: c[3], fix: c[4] };
  });
  list.sort((a, b) => a.code.slice(0, 3).localeCompare(b.code.slice(0, 3)) || num(a.code) - num(b.code));
  return list;
}

const CSS = `:root{--bg:#fbfbf8;--fg:#1d2329;--mut:#5b6670;--acc:#b3261e;--card:#fff;--line:#e3e1da;--code:#f3f1ea}
@media (prefers-color-scheme:dark){:root{--bg:#15181b;--fg:#e7e9ea;--mut:#9aa4ad;--acc:#ff8a80;--card:#1d2125;--line:#2d3237;--code:#23282d}}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--fg);font:16px/1.6 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}
.w{max-width:820px;margin:0 auto;padding:16px}a{color:var(--acc)}header.top{border-bottom:1px solid var(--line)}
header.top .w{display:flex;gap:12px;align-items:center;justify-content:space-between;flex-wrap:wrap}
.brand{font-weight:700;text-decoration:none;color:var(--fg)}h1{font-size:1.7rem;line-height:1.25;margin:.6em 0 .3em}
h2{font-size:1.15rem;margin:1.6em 0 .4em}.code{font-family:ui-monospace,Consolas,monospace;color:var(--acc)}
.card{background:var(--card);border:1px solid var(--line);border-radius:10px;padding:14px 16px;margin:14px 0}
.mut{color:var(--mut);font-size:.92rem}ul.ix{list-style:none;padding:0;margin:0}ul.ix li{border-bottom:1px solid var(--line);padding:8px 0}
ul.ix a{text-decoration:none}input[type=search]{width:100%;padding:10px 12px;font-size:1rem;border:1px solid var(--line);border-radius:8px;background:var(--card);color:var(--fg)}
.cta{display:grid;gap:10px;grid-template-columns:1fr 1fr}@media (max-width:560px){.cta{grid-template-columns:1fr}}.cta a{display:block;padding:12px;border:1px solid var(--line);border-radius:10px;background:var(--card);text-decoration:none;color:var(--fg)}
.cta b{color:var(--acc)}.ad-slot{display:none}nav.rel a{margin-right:14px;white-space:nowrap}footer{border-top:1px solid var(--line);margin-top:32px}`;

function page({ title, desc, canon, body, ld, rel = '' }) {
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title><meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${canon}"><meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(desc)}">
<meta property="og:type" content="article"><meta property="og:url" content="${canon}">
<style>${CSS}</style>${ld ? `<script type="application/ld+json">${JSON.stringify(ld).replace(/</g, '\\u003c')}</script>` : ''}
</head><body><header class="top"><div class="w"><a class="brand" href="${rel}./">ORA Error Reference</a><a href="${rel}./#search">Search errors</a></div></header>
<main class="w">${body}</main>
<footer><div class="w mut">Independent reference written for developers. Not affiliated with Oracle. Oracle and PL/SQL are trademarks of Oracle Corporation.
Explanations are original summaries; always confirm against your database version.</div></footer></body></html>
`;
}

const promo = `<!-- ad-slot: reserved for ads once there is traffic -->
<div class="ad-slot" data-slot="in-article"></div>
<h2>Catch it before it runs</h2><div class="cta">
<a href="${LINKS.helper}" rel="noopener"><b>ORA Error Helper</b><br><span class="mut">Explains ORA-/PLS- codes inside JetBrains IDEs and DataGrip.</span></a>
<a href="${LINKS.lint}" rel="noopener"><b>PL/SQL Lint</b><br><span class="mut">Flags risky PL/SQL patterns while you type.</span></a>
<a href="${LINKS.plan}" rel="noopener"><b>Oracle Plan Reader</b><br><span class="mut">Reads execution plans and points at the slow step.</span></a>
<a href="${LINKS.book}" rel="noopener"><b>PL/SQL in Practice</b><br><span class="mut">Kindle book with practical PL/SQL for working developers.</span></a></div>`;

function errorPage(e, i, list) {
  const same = list.filter(x => x.code.slice(0, 3) === e.code.slice(0, 3));
  const k = same.indexOf(e);
  const near = same.slice(Math.max(0, k - 3), k + 4).filter(x => x !== e);
  const desc = `${e.code}: ${e.title}. ${e.cause}`.slice(0, 155).replace(/\s+\S*$/, '') + '…';
  const ld = {
    '@context': 'https://schema.org', '@type': 'FAQPage',
    mainEntity: [
      { '@type': 'Question', name: `What causes ${e.code}?`, acceptedAnswer: { '@type': 'Answer', text: e.cause } },
      { '@type': 'Question', name: `How do I fix ${e.code}?`, acceptedAnswer: { '@type': 'Answer', text: e.fix } },
    ],
  };
  const body = `<p class="mut"><a href="../">All errors</a> › ${e.code.slice(0, 3)} errors</p>
<h1><span class="code">${e.code}</span>: ${esc(e.title)}</h1>
<div class="card"><h2 style="margin-top:0">What it means</h2><p>${esc(e.cause)}</p></div>
<div class="card"><h2 style="margin-top:0">How to fix it</h2><p>${esc(e.fix)}</p></div>
${promo}
<h2>Nearby errors</h2><nav class="rel">${near.map(x => `<a href="../${x.code}/">${x.code}</a>`).join(' ')}</nav>
<p class="mut">Updated ${TODAY}.</p>`;
  return page({ title: `${e.code}: ${e.title} – cause and fix`, desc, canon: BASE + e.code + '/', body, ld, rel: '../' });
}

function indexPage(list) {
  const ora = list.filter(e => e.code.startsWith('ORA')).length;
  const items = list.map(e => `<li data-k="${esc((e.code + ' ' + e.title).toLowerCase())}"><a href="${e.code}/"><span class="code">${e.code}</span> ${esc(e.title)}</a></li>`).join('\n');
  const body = `<h1>Oracle ORA- and PL/SQL PLS- error reference</h1>
<p>Plain-language causes and fixes for ${list.length} common Oracle errors (${ora} ORA-, ${list.length - ora} PLS-). One page per error, written for developers who need the fix, not the manual.</p>
<p id="search"><input type="search" id="q" placeholder="Type a code or words, e.g. 01403 or mutating" aria-label="Search errors" autocomplete="off"></p>
<p class="mut" id="n">${list.length} errors</p>
<ul class="ix" id="ix">${items}</ul>
${promo}
<script>(function(){var q=document.getElementById('q'),li=[].slice.call(document.querySelectorAll('#ix li')),n=document.getElementById('n');
q.addEventListener('input',function(){var v=q.value.trim().toLowerCase().replace(/^(ora|pls)-?/,'');var c=0;li.forEach(function(l){var s=!v||l.dataset.k.indexOf(v)>=0;l.hidden=!s;if(s)c++});n.textContent=c+' errors'});
if(location.hash.length>1&&location.hash!=='#search'){q.value=decodeURIComponent(location.hash.slice(1));q.dispatchEvent(new Event('input'))}})();</script>`;
  const ld = { '@context': 'https://schema.org', '@type': 'WebSite', name: 'ORA Error Reference', url: BASE };
  return page({ title: 'ORA error codes: causes and fixes (Oracle ORA- and PLS- reference)', desc: `Look up ${list.length} Oracle ORA- and PL/SQL PLS- errors: what each one means and how to fix it, with short practical steps.`, canon: BASE, body, ld });
}

function build() {
  const list = load();
  fs.rmSync(OUT, { recursive: true, force: true });
  fs.mkdirSync(OUT, { recursive: true });
  list.forEach((e, i) => {
    fs.mkdirSync(path.join(OUT, e.code), { recursive: true });
    fs.writeFileSync(path.join(OUT, e.code, 'index.html'), errorPage(e, i, list));
  });
  fs.writeFileSync(path.join(OUT, 'index.html'), indexPage(list));
  const urls = [BASE, ...list.map(e => BASE + e.code + '/')];
  fs.writeFileSync(path.join(OUT, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map(u => `<url><loc>${u}</loc><lastmod>${TODAY}</lastmod></url>`).join('\n')}\n</urlset>\n`);
  console.log(`ora: ${list.length} pagini în ${OUT}`);
  return list;
}

if (require.main === module) build();
module.exports = { build, load };
