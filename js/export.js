/* export.js — 导出 PNG / 保存与打开 JSON / 打印 */
(function () {
  'use strict';
  var TL = window.TL = window.TL || {};
  var E = {};

  function slug(s) {
    return String(s || 'timeline').replace(/[\\/:*?"<>|]+/g, '').replace(/\s+/g, '_').slice(0, 60) || 'timeline';
  }
  function download(name, href) {
    var a = document.createElement('a');
    a.download = name;
    a.href = href;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  E.png = function () {
    var b = TL.model.bounds();
    var pad = (b.hi - b.lo) * 0.05 || 1;
    var view = { t0: b.lo - pad, t1: b.hi + pad };

    var s = TL.model.get();
    var count = s.events.length + s.periods.length + s.eras.length;
    var w = 1800;
    var h = Math.max(640, Math.min(6000, 360 + s.events.length * 30 + s.periods.length * 36 + s.eras.length * 4));

    var cv = document.createElement('canvas');
    TL.render.renderToCanvas(cv, w, h, 2, view);
    var title = s.title || '时间线';
    download(slug(title) + '.png', cv.toDataURL('image/png'));
  };

  E.saveJSON = function () {
    var data = {
      app: 'timeline',
      version: 1,
      savedAt: new Date().toISOString(),
      data: TL.model.get()
    };
    var blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    var url = URL.createObjectURL(blob);
    download(slug(TL.model.get().title) + '.json', url);
    setTimeout(function () { URL.revokeObjectURL(url); }, 2000);
  };

  E.loadJSONFile = function (file) {
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function () {
      try {
        var parsed = JSON.parse(reader.result);
        var d = parsed.data || parsed; // 兼容直接导出的模型
        if (!d || typeof d !== 'object') throw new Error('格式错误');
        d = E.normalize(d);
        TL.model.setState(d);
        TL.ui.select(null, null);
        TL.render.fit();
        TL.ui.refresh();
      } catch (err) {
        alert('打开失败：' + err.message);
      }
    };
    reader.readAsText(file);
  };

  E.normalize = function (d) {
    var out = {
      title: d.title || '我的时间线',
      categories: Array.isArray(d.categories) ? d.categories : [],
      eras: Array.isArray(d.eras) ? d.eras : [],
      periods: Array.isArray(d.periods) ? d.periods : [],
      events: Array.isArray(d.events) ? d.events : []
    };
    var seen = {};
    ['categories', 'eras', 'periods', 'events'].forEach(function (k) {
      out[k] = out[k].filter(function (it) {
        if (!it || typeof it !== 'object') return false;
        if (!it.id) it.id = TL.model.uid();
        if (seen[it.id]) return false;
        seen[it.id] = true;
        return true;
      });
    });
    // 事件补全日期字符串
    out.events.forEach(function (e) {
      if (e.date == null) e.date = 1900;
      if (!e.dateStr) e.dateStr = TL.date.format(e.date);
      if (e.endDate != null && !e.endDateStr) e.endDateStr = TL.date.format(e.endDate);
    });
    out.periods.forEach(function (p) {
      if (p.start == null) p.start = 1900;
      if (p.end == null) p.end = 2000;
    });
    out.eras.forEach(function (er) {
      if (er.start == null) er.start = 1900;
      if (er.end == null) er.end = 2000;
    });
    return out;
  };

  E.print = function () {
    var b = TL.model.bounds();
    var pad = (b.hi - b.lo) * 0.05 || 1;
    var view = { t0: b.lo - pad, t1: b.hi + pad };
    var s = TL.model.get();
    var w = 2000;
    var h = Math.max(800, Math.min(6000, 400 + s.events.length * 32 + s.periods.length * 38));

    var cv = document.createElement('canvas');
    TL.render.renderToCanvas(cv, w, h, 2, view);
    var url = cv.toDataURL('image/png');

    var win = window.open('', '_blank');
    if (!win) { alert('浏览器拦截了弹窗，请允许弹出窗口后重试。'); return; }
    win.document.write('<!DOCTYPE html><html><head><meta charset="utf-8"><title>' + (s.title || '时间线') + '</title>' +
      '<style>body{margin:0;padding:16px;font-family:-apple-system,"Segoe UI","PingFang SC",sans-serif;}' +
      'h1{font-size:20px;margin:0 0 8px;}img{max-width:100%;height:auto;}@media print{img{width:100%;}}</style></head>' +
      '<body><h1>' + (s.title || '时间线') + '</h1><img src="' + url + '" onload="setTimeout(function(){window.print()},300)"></body></html>');
    win.document.close();
  };

  TL.export = E;
})();
