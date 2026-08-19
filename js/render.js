/* render.js — Canvas 时间线渲染（纪元/时段/事件/刻度/图片）+ 命中区域 */
(function () {
  'use strict';
  var TL = window.TL = window.TL || {};
  var R = {};

  var canvas = null, ctx = null;
  var FONT = '-apple-system, "Segoe UI", "PingFang SC", "Microsoft YaHei", Roboto, Arial, sans-serif';

  var MARGIN = 60;        // 左右留白（CSS px）

  R.view = { t0: -3500, t1: 2040 };
  R.refSpan = 5540;
  R.axisRatio = 0.55;     // 轴线纵向位置（可调，默认中间偏下）
  R.selection = { type: null, id: null };
  R.hits = [];
  R.metrics = null;
  R.onImageLoad = null;
  R.w = 0; R.h = 0; R.dpr = 1;

  var imgCache = {};

  R.init = function (cv) { canvas = cv; ctx = canvas.getContext('2d'); };

  R.resize = function (cssW, cssH, dpr) {
    R.w = cssW; R.h = cssH; R.dpr = dpr || 1;
    canvas.width = Math.round(cssW * R.dpr);
    canvas.height = Math.round(cssH * R.dpr);
    canvas.style.width = cssW + 'px';
    canvas.style.height = cssH + 'px';
    R.draw();
  };

  R.timeToX = function (t) {
    var m = R.metrics;
    if (!m) return 0;
    return m.m + (t - m.t0) * m.ppy;
  };
  R.xToTime = function (x) {
    var m = R.metrics;
    if (!m) return 0;
    return m.t0 + (x - m.m) / m.ppy;
  };

  // ---- 颜色工具 ----
  function hexToRgb(hex) {
    hex = String(hex || '#2f6fed').replace('#', '');
    if (hex.length === 3) hex = hex.split('').map(function (c) { return c + c; }).join('');
    var n = parseInt(hex, 16);
    if (isNaN(n)) n = 0x2f6fed;
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
  }
  function hexA(hex, a) { var c = hexToRgb(hex); return 'rgba(' + c.r + ',' + c.g + ',' + c.b + ',' + a + ')'; }
  function shade(hex, f) {
    var c = hexToRgb(hex);
    if (f < 0) { var k = 1 + f; return 'rgb(' + Math.round(c.r * k) + ',' + Math.round(c.g * k) + ',' + Math.round(c.b * k) + ')'; }
    return 'rgb(' + Math.round(c.r + (255 - c.r) * f) + ',' + Math.round(c.g + (255 - c.g) * f) + ',' + Math.round(c.b + (255 - c.b) * f) + ')';
  }

  function rr(x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }
  function ellipsis(text, maxW) {
    if (ctx.measureText(text).width <= maxW) return text;
    var t = text;
    while (t.length > 1 && ctx.measureText(t + '…').width > maxW) t = t.slice(0, -1);
    return t + '…';
  }
  function isSel(type, id) { return R.selection && R.selection.type === type && R.selection.id === id; }

  function getImg(src) {
    if (!src) return null;
    var im = imgCache[src];
    if (im === undefined) {
      im = new Image();
      im.onload = function () { if (R.onImageLoad) R.onImageLoad(); };
      im.onerror = function () { imgCache[src] = null; };
      im.src = src;
      imgCache[src] = im;
      return null;
    }
    if (im && im.complete && im.naturalWidth) return im;
    return null;
  }

  // ---- 主绘制 ----
  R.draw = function () {
    if (!ctx || !canvas) return;
    var w = R.w, h = R.h;
    if (!w || !h) return;
    ctx.setTransform(R.dpr, 0, 0, R.dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    var m = MARGIN;
    var plotW = w - m * 2;
    var t0 = R.view.t0, t1 = R.view.t1;
    if (t1 <= t0) return;
    var ppy = plotW / (t1 - t0);
    var axisY = Math.round(h * R.axisRatio);

    R.metrics = { m: m, plotW: plotW, t0: t0, t1: t1, ppy: ppy, axisY: axisY, w: w, h: h };
    R.hits = [];

    var model = TL.model.get();
    if (!model) return;

    drawEras(model, m, w, h);
    drawGrid(model, m, w, h, t0, t1, ppy, axisY);
    drawAxis(m, w, axisY);
    drawPeriods(model, m, w, h, axisY);
    drawEvents(model, m, w, h, axisY);
  };

  function drawEras(model, m, w, h) {
    var eras = model.eras.slice().sort(function (a, b) { return a.start - b.start; });
    ctx.textBaseline = 'top';
    ctx.font = '700 12px ' + FONT;
    eras.forEach(function (er) {
      var x0 = R.timeToX(er.start), x1 = R.timeToX(er.end);
      var c = TL.model.itemColor(er);
      if (x1 < x0) { var tmp = x0; x0 = x1; x1 = tmp; }
      // 完全在可视区外 → 跳过（不画色带、不画名称，避免贴边堆积）
      if (x1 < 0 || x0 > w) return;

      var vx0 = Math.max(x0, 0);
      var vx1 = Math.min(x1, w);
      ctx.fillStyle = hexA(c, 0.10);
      ctx.fillRect(vx0, 0, vx1 - vx0, h);
      ctx.fillStyle = hexA(c, 0.55);
      ctx.fillRect(vx0, 0, 2, h);

      var label = er.name || '(未命名纪元)';
      var lw = ctx.measureText(label).width;
      // 名称在纪元的可见部分居中（超出部分自然裁掉，不贴边）
      var lx = vx0 + (vx1 - vx0) / 2 - lw / 2;
      ctx.fillStyle = shade(c, -0.35);
      ctx.fillText(label, lx, 7);
      R.hits.push({ type: 'era', id: er.id, x: lx - 2, y: 5, w: lw + 4, h: 17 });
    });
  }

  function drawGrid(model, m, w, h, t0, t1, ppy, axisY) {
    var tk = TL.date.ticks(t0, t1, ppy, 96);
    ctx.strokeStyle = '#eef2f7';
    ctx.lineWidth = 1;
    tk.ticks.forEach(function (tick) {
      var x = R.timeToX(tick.t);
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
    });
    R.ticks = tk;
  }

  function drawAxis(m, w, axisY) {
    ctx.strokeStyle = '#b7c2d1';
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(m, axisY); ctx.lineTo(w - m, axisY); ctx.stroke();

    // 刻度标签
    var tk = R.ticks;
    if (!tk) return;
    ctx.fillStyle = '#6b7280';
    ctx.font = '11px ' + FONT;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    tk.ticks.forEach(function (tick) {
      var x = R.timeToX(tick.t);
      ctx.strokeStyle = '#9fb0c4';
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(x, axisY); ctx.lineTo(x, axisY + 7); ctx.stroke();
      ctx.fillText(tick.label, x, axisY + 10);
    });
  }

  function drawPeriods(model, m, w, h, axisY) {
    var periods = model.periods.slice().sort(function (a, b) { return a.start - b.start; });
    var rows = [];
    var meta = [];
    periods.forEach(function (p) {
      var x0 = R.timeToX(p.start), x1 = R.timeToX(p.end);
      if (x1 < x0) { var t = x0; x0 = x1; x1 = t; }
      // 完全在可视区外 → 跳过（不画、不占行，避免贴边堆积）
      if (x1 < m || x0 > w - m) return;
      x0 = Math.max(x0, m);
      x1 = Math.min(x1, w - m);
      var row = 0;
      while (row < rows.length && rows[row].right > x0 + 2) row++;
      if (row === rows.length) rows.push({ right: -1e9 });
      rows[row].right = x1 + 10;
      meta.push({ p: p, x0: x0, x1: x1, row: row });
    });

    var barH = 24, gap = 8;
    ctx.font = '600 12px ' + FONT;
    meta.forEach(function (it) {
      var y = axisY + 18 + it.row * (barH + gap);
      var c = TL.model.itemColor(it.p);
      var sel = isSel('period', it.p.id);
      rr(it.x0, y, it.x1 - it.x0, barH, 6);
      ctx.fillStyle = c;
      ctx.fill();
      if (sel) { ctx.strokeStyle = '#0b1220'; ctx.lineWidth = 2; ctx.stroke(); }

      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      var pad = 6;
      var innerW = (it.x1 - it.x0) - pad * 2;
      if (innerW > 16) {
        ctx.save();
        ctx.beginPath(); ctx.rect(it.x0 + pad, y, innerW, barH); ctx.clip();
        ctx.fillText(ellipsis(it.p.name || '(未命名)', innerW), it.x0 + pad, y + barH / 2 + 0.5);
        ctx.restore();
      }

      ctx.fillStyle = '#6b7280';
      ctx.font = '10px ' + FONT;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(TL.date.format(it.p.start), it.x0, y + barH + 3);
      ctx.fillText(TL.date.format(it.p.end), it.x1, y + barH + 3);

      if (sel) {
        ctx.fillStyle = '#0b1220';
        ctx.fillRect(it.x0 - 3, y - 3, 6, barH + 6);
        ctx.fillRect(it.x1 - 3, y - 3, 6, barH + 6);
      }

      R.hits.push({ type: 'period', id: it.p.id, part: 'move', x: it.x0 + 6, y: y, w: it.x1 - it.x0 - 12, h: barH });
      R.hits.push({ type: 'period', id: it.p.id, part: 'start', x: it.x0 - 6, y: y - 3, w: 12, h: barH + 6 });
      R.hits.push({ type: 'period', id: it.p.id, part: 'end', x: it.x1 - 6, y: y - 3, w: 12, h: barH + 6 });
    });
  }

  function drawEvents(model, m, w, h, axisY) {
    var events = model.events.slice().sort(function (a, b) { return a.date - b.date; });
    ctx.font = '500 12px ' + FONT;
    var lanes = [];
    var meta = [];
    events.forEach(function (ev) {
      var x = R.timeToX(ev.date);
      var label = ev.title || '(未命名)';
      var lw = ctx.measureText(label).width + 18;
      var hasThumb = !!(ev.image && ev.showImage !== false);
      var effW = hasThumb ? Math.max(lw, 76) : lw;
      var lane = 0;
      while (lane < lanes.length && lanes[lane].right > x - effW / 2) lane++;
      if (lane === lanes.length) lanes.push({ right: -1e9 });
      lanes[lane].right = x + effW / 2 + 6;
      meta.push({ ev: ev, x: x, label: label, lw: lw, lane: lane, hasThumb: hasThumb });
    });

    var labelH = 20;
    meta.forEach(function (it) {
      var ev = it.ev;
      var c = TL.model.itemColor(ev);
      var sel = isSel('event', ev.id);
      var labelY = axisY - 28 - it.lane * 30;
      var labelBottom = labelY + labelH;

      // 图片缩略图
      var thH = 0;
      if (it.hasThumb) {
        var thW = 64; thH = 44;
        var thX = it.x - thW / 2, thY = labelY - thH - 6;
        var img = getImg(ev.image);
        if (img) ctx.drawImage(img, thX, thY, thW, thH);
        else { ctx.fillStyle = '#eef2f7'; ctx.fillRect(thX, thY, thW, thH); }
        ctx.strokeStyle = hexA(c, 0.5);
        ctx.lineWidth = 1;
        ctx.strokeRect(thX + 0.5, thY + 0.5, thW - 1, thH - 1);
        R.hits.push({ type: 'event', id: ev.id, part: 'select', x: thX, y: thY, w: thW, h: thH });
      }

      // 连接线
      ctx.strokeStyle = '#c7d0dc';
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(it.x, axisY - 3); ctx.lineTo(it.x, labelBottom); ctx.stroke();

      // 标签框
      rr(it.x - it.lw / 2, labelY, it.lw, labelH, 6);
      ctx.fillStyle = sel ? '#e8f0fe' : '#ffffff';
      ctx.fill();
      ctx.strokeStyle = sel ? '#2f6fed' : hexA(c, 0.55);
      ctx.lineWidth = sel ? 2 : 1;
      ctx.stroke();

      ctx.fillStyle = '#1f2937';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.save();
      ctx.beginPath(); ctx.rect(it.x - it.lw / 2 + 4, labelY, it.lw - 8, labelH); ctx.clip();
      ctx.fillText(ellipsis(it.label, it.lw - 8), it.x, labelY + labelH / 2 + 0.5);
      ctx.restore();

      // 圆点
      ctx.beginPath(); ctx.arc(it.x, axisY, sel ? 5 : 4, 0, Math.PI * 2);
      ctx.fillStyle = c;
      ctx.fill();
      if (sel) { ctx.strokeStyle = '#0b1220'; ctx.lineWidth = 2; ctx.stroke(); }

      // 年份
      ctx.fillStyle = '#9aa3b2';
      ctx.font = '10px ' + FONT;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(TL.date.format(ev.date), it.x, axisY + 6);

      R.hits.push({ type: 'event', id: ev.id, part: 'move', x: it.x - 9, y: axisY - 9, w: 18, h: 18 });
      R.hits.push({ type: 'event', id: ev.id, part: 'select', x: it.x - it.lw / 2, y: labelY, w: it.lw, h: labelH });
    });
  }

  R.hitTest = function (x, y) {
    for (var i = R.hits.length - 1; i >= 0; i--) {
      var r = R.hits[i];
      if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) return r;
    }
    return null;
  };

  // ---- 视图操作 ----
  R.fit = function () {
    var b = TL.model.bounds();
    var pad = (b.hi - b.lo) * 0.08 || 1;
    R.view.t0 = b.lo - pad;
    R.view.t1 = b.hi + pad;
    R.refSpan = R.view.t1 - R.view.t0;
  };

  R.setAxisRatio = function (ratio) {
    R.axisRatio = Math.max(0.1, Math.min(0.9, ratio));
    R.draw();
  };

  R.zoomBy = function (factor, cx) {
    var m = R.metrics;
    if (!m) return;
    var t = R.xToTime(cx);
    var span = R.view.t1 - R.view.t0;
    var newSpan = span / factor;
    if (newSpan < 1e-6 || newSpan > 1e9) return;
    var f = (cx - m.m) / m.plotW;
    R.view.t0 = t - newSpan * f;
    R.view.t1 = t + newSpan * (1 - f);
  };

  R.panBy = function (dxPx) {
    var m = R.metrics;
    if (!m) return;
    var dt = -dxPx / m.ppy;
    R.view.t0 += dt;
    R.view.t1 += dt;
  };

  R.zoomLabel = function () {
    if (!R.metrics) return '100%';
    var span = R.view.t1 - R.view.t0;
    var ref = R.refSpan || span || 1;
    return Math.round(100 * ref / span) + '%';
  };

  R.ctx = function () { return ctx; };

  // 将当前模型绘制到指定画布（用于导出），绘制后恢复原画布
  R.renderToCanvas = function (targetCv, cssW, cssH, dpr, view) {
    var old = {
      canvas: canvas, ctx: ctx, w: R.w, h: R.h, dpr: R.dpr,
      t0: R.view.t0, t1: R.view.t1, metrics: R.metrics, hits: R.hits
    };
    canvas = targetCv;
    ctx = targetCv.getContext('2d');
    targetCv.width = Math.round(cssW * dpr);
    targetCv.height = Math.round(cssH * dpr);
    R.w = cssW; R.h = cssH; R.dpr = dpr;
    R.view.t0 = view.t0; R.view.t1 = view.t1;
    R.draw();
    canvas = old.canvas; ctx = old.ctx;
    R.w = old.w; R.h = old.h; R.dpr = old.dpr;
    R.view.t0 = old.t0; R.view.t1 = old.t1;
    R.metrics = old.metrics; R.hits = old.hits;
  };

  TL.render = R;
})();
