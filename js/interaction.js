/* interaction.js — 指针交互：选中 / 拖拽改期 / 缩放平移 */
(function () {
  'use strict';
  var TL = window.TL = window.TL || {};
  var I = {};

  var canvas = null;
  var R = null;
  var drag = null;

  function pos(e) {
    var rect = canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }
  function clampTime(t) {
    if (t < -999999) return -999999;
    if (t > 999999) return 999999;
    return t;
  }

  I.init = function (cv) {
    canvas = cv;
    R = TL.render;
    canvas.addEventListener('pointerdown', onDown);
    canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('pointerup', onUp);
    canvas.addEventListener('pointercancel', onUp);
    canvas.addEventListener('wheel', onWheel, { passive: false });
    canvas.addEventListener('dblclick', onDbl);
    canvas.addEventListener('contextmenu', function (e) { e.preventDefault(); });
  };

  function onDown(e) {
    var p = pos(e);
    var hit = R.hitTest(p.x, p.y);
    if (hit) {
      if (hit.type === 'era') { TL.ui.select('era', hit.id); return; }
      if (hit.type === 'event') {
        TL.ui.select('event', hit.id);
        if (hit.part === 'move') drag = { kind: 'event', id: hit.id, moved: false };
        canvas.setPointerCapture(e.pointerId);
        return;
      }
      if (hit.type === 'period') {
        TL.ui.select('period', hit.id);
        drag = { kind: 'period', id: hit.id, part: hit.part, moved: false };
        canvas.setPointerCapture(e.pointerId);
        return;
      }
      return;
    }
    TL.ui.select(null, null);
    drag = { kind: 'pan', startX: p.x, startT0: R.view.t0, startT1: R.view.t1 };
    canvas.setPointerCapture(e.pointerId);
    canvas.classList.add('panning');
  }

  function onMove(e) {
    var p = pos(e);
    if (!drag) { updateCursor(p); return; }

    if (drag.kind === 'pan') {
      var dx = p.x - drag.startX;
      var dt = -dx / R.metrics.ppy;
      R.view.t0 = drag.startT0 + dt;
      R.view.t1 = drag.startT1 + dt;
      TL.ui.refresh(true);
      return;
    }

    if (drag.kind === 'event') {
      if (!drag.moved) { TL.model.beginUndo(); drag.moved = true; }
      var t = clampTime(R.xToTime(p.x));
      TL.model.update('event', drag.id, { date: t, dateStr: TL.date.format(t) }, false);
      return;
    }

    if (drag.kind === 'period') {
      var pr = TL.model.getByType('period', drag.id);
      if (!pr) return;
      var tt = clampTime(R.xToTime(p.x));
      var patch = null;
      if (drag.part === 'start') {
        if (tt < pr.end) patch = { start: tt, startStr: TL.date.format(tt) };
      } else if (drag.part === 'end') {
        if (tt > pr.start) patch = { end: tt, endStr: TL.date.format(tt) };
      } else {
        var span = pr.end - pr.start;
        var ns = tt - span / 2;
        patch = { start: ns, end: ns + span, startStr: TL.date.format(ns), endStr: TL.date.format(ns + span) };
      }
      if (patch) {
        if (!drag.moved) { TL.model.beginUndo(); drag.moved = true; }
        TL.model.update('period', drag.id, patch, false);
      }
      return;
    }
  }

  function onUp(e) {
    if (drag) {
      canvas.classList.remove('panning');
      drag = null;
      try { canvas.releasePointerCapture(e.pointerId); } catch (err) {}
      TL.ui.refresh();
    }
  }

  function onWheel(e) {
    e.preventDefault();
    var p = pos(e);
    var factor = e.deltaY < 0 ? 1.12 : 1 / 1.12;
    R.zoomBy(factor, p.x);
    TL.ui.refresh(true);
  }

  function onDbl() {
    R.fit();
    TL.ui.refresh(true);
  }

  function updateCursor(p) {
    var hit = R.hitTest(p.x, p.y);
    if (!hit) { canvas.style.cursor = 'grab'; return; }
    if (hit.type === 'period' && (hit.part === 'start' || hit.part === 'end')) { canvas.style.cursor = 'ew-resize'; return; }
    if (hit.type === 'event' && hit.part === 'move') { canvas.style.cursor = 'grab'; return; }
    if (hit.type === 'era') { canvas.style.cursor = 'pointer'; return; }
    canvas.style.cursor = 'pointer';
  }

  TL.interaction = I;
})();
