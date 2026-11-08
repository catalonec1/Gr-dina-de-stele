// Bot pentru teste: câmp de distanță geodezică spre gaură + lovitură lacomă (rulează în pagină)
window.__bot = function (li, opt) {
  opt = opt || {};
  var C = compile(LEVELS[li]), L = C.L, GW = 100, GH = 160, INF = 1e9;
  var cost = new Float64Array(GW * GH), dist = new Float64Array(GW * GH).fill(INF);
  for (var y = 0; y < GH; y++) for (var x = 0; x < GW; x++) {
    var px = x + 0.5, py = y + 0.5, blocked = false;
    // umflăm obstacolele cu raza mingii
    for (var a = 0; a < 8 && !blocked; a++) { var qx = px + Math.cos(a * 0.785) * R * 0.9, qy = py + Math.sin(a * 0.785) * R * 0.9; if (solidAt(C, qx, qy, null)) blocked = true; }
    if (solidAt(C, px, py, null)) blocked = true;
    var w = false; for (var i = 0; i < C.water.length; i++) if (inRect(px, py, C.water[i])) w = true;
    var s = false; for (i = 0; i < C.sand.length; i++) if (inRect(px, py, C.sand[i])) s = true;
    cost[y * GW + x] = blocked || w ? -1 : s ? 2.5 : 1;
  }
  // Dijkstra simplu (coadă sortată prin bucket)
  var hx = Math.floor(L.hole[0]), hy = Math.floor(L.hole[1]), Q = [[0, hy * GW + hx]]; dist[hy * GW + hx] = 0;
  var portals = C.portal;
  while (Q.length) {
    var bi = 0; for (var k = 1; k < Q.length; k++) if (Q[k][0] < Q[bi][0]) bi = k;
    var cur = Q[bi]; Q[bi] = Q[Q.length - 1]; Q.pop();
    var d = cur[0], id = cur[1]; if (d > dist[id]) continue;
    var cx = id % GW, cy = (id - cx) / GW;
    for (var dy = -1; dy <= 1; dy++) for (var dx = -1; dx <= 1; dx++) {
      if (!dx && !dy) continue; var nx = cx + dx, ny = cy + dy; if (nx < 0 || ny < 0 || nx >= GW || ny >= GH) continue;
      var nid = ny * GW + nx, c = cost[nid]; if (c < 0) continue;
      var nd = d + c * (dx && dy ? 1.414 : 1); if (nd < dist[nid]) { dist[nid] = nd; Q.push([nd, nid]); }
    }
    // portal: intrarea A are distanța ieșirii B
    for (var p = 0; p < portals.length; p++) { var po = portals[p]; if (Math.floor(po[2]) === cx && Math.floor(po[3]) === cy) { var aid = Math.floor(po[1]) * GW + Math.floor(po[0]); if (d < dist[aid]) { dist[aid] = d; Q.push([d, aid]); } } }
  }
  if (Q.length > 200000) return null;
  var D = function (x, y) { var ix = Math.max(0, Math.min(GW - 1, Math.floor(x))), iy = Math.max(0, Math.min(GH - 1, Math.floor(y))); var v = dist[iy * GW + ix]; return v >= INF ? 999 : v; };
  var bx = L.ball[0], by = L.ball[1], tm = 0, strokes = 0, angN = opt.angN || 90, pows = opt.pows || [0.12, 0.22, 0.34, 0.46, 0.6, 0.75, 0.9, 1];
  var startD = D(bx, by);
  while (strokes < (opt.max || 12)) {
    strokes++; var best = null, bv = 1e18;
    for (var ai = 0; ai < angN; ai++) for (var pi = 0; pi < pows.length; pi++) {
      var ang = ai / angN * Math.PI * 2, B = simShot(C, bx, by, tm, ang, pows[pi], 14), v;
      if (B.sunk) v = -1e9 + pows[pi]; else if (B.splash) v = 1e6; else v = D(B.x, B.y) * 10 + pows[pi];
      if (v < bv) { bv = v; best = B; B.ang = ang; B.pow = pows[pi]; }
    }
    if (opt.noise) { var rn = opt.rng; best = simShot(C, bx, by, tm, best.ang + (rn() - 0.5) * opt.noise * 0.07, Math.max(0.05, Math.min(1, best.pow * (1 + (rn() - 0.5) * opt.noise * 0.12))), 14); }
    if (best.sunk) return { strokes: strokes, startD: startD };
    if (best.splash) { strokes++; tm = best.tm + 1; continue; }
    bx = best.x; by = best.y; tm = best.tm + 0.5;
  }
  return { strokes: 99, startD: startD, end: [bx, by] };
};
