/* main.js — 启动：画布尺寸 / 载入数据 / 自动保存 / 快捷键 */
(function () {
  'use strict';
  var TL = window.TL;
  var canvas = document.getElementById('tl');
  var wrap = document.getElementById('canvas-wrap');

  TL.render.init(canvas);
  TL.render.onImageLoad = function () { TL.render.draw(); };
  TL.interaction.init(canvas);
  TL.ui.init();

  function resize() {
    var r = wrap.getBoundingClientRect();
    if (r.width > 0 && r.height > 0) TL.render.resize(r.width, r.height, window.devicePixelRatio || 1);
  }
  window.addEventListener('resize', resize);
  if (window.ResizeObserver) new ResizeObserver(resize).observe(wrap);

  // 载入：本地自动保存优先，否则示例
  var loaded = false;
  try {
    var saved = localStorage.getItem('timeline-project');
    if (saved) {
      var parsed = JSON.parse(saved);
      TL.model.setState(TL.export.normalize(parsed.data || parsed));
      loaded = true;
    }
  } catch (e) { /* ignore */ }
  if (!loaded) TL.model.setState(TL.sample());

  resize();
  TL.render.fit();
  TL.ui.refresh();
  TL.ui.select(null, null);

  // 自动保存（防抖）
  var saveTimer = null;
  function autosave() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(function () {
      try {
        var data = { app: 'timeline', version: 1, savedAt: new Date().toISOString(), data: TL.model.get() };
        localStorage.setItem('timeline-project', JSON.stringify(data));
      } catch (e) { /* ignore */ }
    }, 400);
  }
  TL.model.onChange(autosave);

  // 快捷键
  document.addEventListener('keydown', function (e) {
    var tag = (document.activeElement && document.activeElement.tagName) || '';
    var typing = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
    var k = e.key.toLowerCase();

    if ((e.ctrlKey || e.metaKey) && k === 'z') {
      e.preventDefault();
      if (e.shiftKey) TL.model.redo(); else TL.model.undo();
      return;
    }
    if ((e.ctrlKey || e.metaKey) && k === 'y') { e.preventDefault(); TL.model.redo(); return; }
    if ((e.ctrlKey || e.metaKey) && k === 's') { e.preventDefault(); TL.export.saveJSON(); return; }

    if ((e.key === 'Delete' || e.key === 'Backspace') && !typing && TL.ui.mode === 'edit' && TL.ui.id) {
      e.preventDefault();
      TL.ui.deleteSelected();
    }
    if (e.key === 'Escape' && !typing) TL.ui.select(null, null);
  });
})();
