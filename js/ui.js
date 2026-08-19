/* ui.js — 工具栏 / 列表 / 属性表单 / 类别管理 */
(function () {
  'use strict';
  var TL = window.TL = window.TL || {};
  var UI = {};

  var $ = function (id) { return document.getElementById(id); };

  // 编辑状态
  UI.mode = '';      // '' | 'create' | 'edit'
  UI.type = 'event';
  UI.id = null;

  var PALETTE = ['#2f6fed', '#e5484d', '#0fa968', '#a855f7', '#f59e0b', '#0891b2', '#db2777', '#65a30d'];

  UI.init = function () {
    TL.model.onChange(function () { UI.refresh(); });

    // 工具栏
    $('btn-add-event').addEventListener('click', function () { UI.newItem('event'); });
    $('btn-add-period').addEventListener('click', function () { UI.newItem('period'); });
    $('btn-add-era').addEventListener('click', function () { UI.newItem('era'); });
    $('btn-undo').addEventListener('click', function () { TL.model.undo(); });
    $('btn-redo').addEventListener('click', function () { TL.model.redo(); });
    $('btn-zoom-out').addEventListener('click', function () { TL.render.zoomBy(1 / 1.4, TL.render.w / 2); UI.refresh(true); });
    $('btn-zoom-in').addEventListener('click', function () { TL.render.zoomBy(1.4, TL.render.w / 2); UI.refresh(true); });
    $('btn-fit').addEventListener('click', function () { TL.render.fit(); UI.refresh(true); });
    $('btn-sample').addEventListener('click', function () { TL.model.setState(TL.sample()); UI.select(null, null); TL.render.fit(); UI.refresh(); });
    $('btn-clear').addEventListener('click', function () {
      if (confirm('确定清空当前时间线的全部内容？')) { TL.model.reset(); UI.select(null, null); TL.render.fit(); UI.refresh(); }
    });

    $('btn-png').addEventListener('click', function () { TL.export.png(); });
    $('btn-save-json').addEventListener('click', function () { TL.export.saveJSON(); });
    $('btn-load-json').addEventListener('click', function () { $('file-json').click(); });
    $('file-json').addEventListener('change', function (e) { TL.export.loadJSONFile(e.target.files[0]); e.target.value = ''; });
    $('btn-print').addEventListener('click', function () { TL.export.print(); });

    $('tl-title').addEventListener('change', function () {
      TL.model.setTitle(this.value.trim() || '我的时间线');
    });

    // 左侧浏览
    $('search').addEventListener('input', function () { UI.rebuildList(); });
    $('cat-filter').addEventListener('change', function () { UI.rebuildList(); });

    // 表单
    $('f-period-toggle').addEventListener('change', function () {
      $('row-enddate').style.display = this.checked ? 'flex' : 'none';
    });
    $('f-image').addEventListener('input', function () { UI.updateImagePreview(); });
    $('btn-pick-image').addEventListener('click', function () { $('f-image-file').click(); });
    $('f-image-file').addEventListener('change', function (e) {
      var f = e.target.files && e.target.files[0];
      if (!f) return;
      var reader = new FileReader();
      reader.onload = function () {
        $('f-image').value = reader.result;
        UI.updateImagePreview();
      };
      reader.readAsDataURL(f);
      e.target.value = '';
    });
    $('btn-save').addEventListener('click', function () { UI.submit(); });
    $('btn-delete').addEventListener('click', function () { UI.deleteSelected(); });
    $('btn-cancel').addEventListener('click', function () { UI.select(null, null); });

    // 类别
    $('btn-add-cat').addEventListener('click', function () { UI.addCategory(); });
    $('new-cat-name').addEventListener('keydown', function (e) { if (e.key === 'Enter') UI.addCategory(); });

    UI.showEmptyEditor();
  };

  // ---------- 刷新 ----------
  UI.refresh = function (light) {
    TL.render.draw();
    UI.updateZoomLabel();
    UI.updateUndoButtons();
    if (light) return;
    UI.rebuildList();
    UI.rebuildCategories();
    UI.updateTitle();
    UI.updateCounts();
    UI.syncEditor();
  };

  UI.updateZoomLabel = function () { $('zoom-label').textContent = TL.render.zoomLabel(); };
  UI.updateUndoButtons = function () {
    $('btn-undo').disabled = !TL.model.canUndo();
    $('btn-redo').disabled = !TL.model.canRedo();
  };
  UI.updateTitle = function () { $('tl-title').value = TL.model.get().title || '我的时间线'; };

  UI.updateCounts = function () {
    var s = TL.model.get();
    $('counts').textContent = s.events.length + ' 事件 · ' + s.periods.length + ' 时段 · ' + s.eras.length + ' 纪元';
  };

  // ---------- 选中 ----------
  UI.select = function (type, id) {
    if (!type || !id) {
      TL.render.selection = { type: null, id: null };
      UI.mode = ''; UI.type = 'event'; UI.id = null;
      UI.showEmptyEditor();
      UI.rebuildList();
      TL.render.draw();
      return;
    }
    TL.render.selection = { type: type, id: id };
    UI.mode = 'edit'; UI.type = type; UI.id = id;
    UI.layoutEditor(type);
    UI.fillEditor(type, id);
    UI.rebuildList();
    TL.render.draw();
  };

  UI.newItem = function (type) {
    UI.mode = 'create'; UI.type = type; UI.id = null;
    TL.render.selection = { type: null, id: null };
    UI.layoutEditor(type);
    var s = TL.model.get();
    var today = TL.date.format(new Date().getFullYear());
    var catId = s.categories.length ? s.categories[0].id : null;

    $('f-title').value = '';
    $('f-period-toggle').checked = false;
    $('f-date').value = type === 'era' ? '-3000' : (type === 'period' ? '1900' : today);
    $('f-enddate').value = type === 'era' ? '500' : '2000';
    $('f-category').value = catId || '';
    $('f-color').value = PALETTE[Math.floor(Math.random() * PALETTE.length)];
    $('f-image').value = ''; $('f-show-image').checked = true;
    $('f-link').value = ''; $('f-desc').value = '';
    UI.updateImagePreview();
    $('row-enddate').style.display = (type === 'event') ? 'none' : 'flex';
    UI.showError('');
    $('btn-delete').style.display = 'none';
    $('editor-head').textContent = { event: '新建事件', period: '新建时段', era: '新建纪元' }[type];
    UI.rebuildList();
    TL.render.draw();
    setTimeout(function () { $('f-title').focus(); }, 0);
  };

  UI.showEmptyEditor = function () {
    UI.layoutEditor(null);
    $('editor-head').textContent = '属性';
    $('editor-error').style.display = 'none';
  };

  // 根据类型显示/隐藏字段
  UI.layoutEditor = function (type) {
    var show = function (id, on) { $(id).style.display = on ? 'flex' : 'none'; };
    show('row-period-toggle', type === 'event');
    show('row-category', type === 'event' || type === 'period');
    show('row-color', type === 'era');
    show('row-image', type === 'event');
    show('row-link', type === 'event');
    show('row-desc', type === 'event' || type === 'period');

    if (!type) {
      ['row-period-toggle', 'row-category', 'row-color', 'row-image', 'row-link', 'row-desc', 'row-enddate'].forEach(function (id) { show(id, false); });
      $('lbl-title').style.display = 'none';
      $('f-title').style.display = 'none';
      $('lbl-date').style.display = 'none';
      $('f-date').style.display = 'none';
      $('date-help').style.display = 'none';
      $('btn-save').style.display = 'none';
      $('btn-delete').style.display = 'none';
      $('btn-cancel').style.display = 'none';
      return;
    }

    $('lbl-title').style.display = '';
    $('f-title').style.display = '';
    $('lbl-date').style.display = '';
    $('f-date').style.display = '';
    $('date-help').style.display = '';
    $('btn-save').style.display = '';
    $('btn-delete').style.display = (UI.mode === 'edit') ? '' : 'none';
    $('btn-cancel').style.display = '';

    $('lbl-title').textContent = type === 'era' ? '名称' : '标题';
    $('lbl-date').textContent = type === 'event' ? '日期' : '开始日期';
    $('row-enddate').style.display = (type === 'event') ? ($('f-period-toggle').checked ? 'flex' : 'none') : 'flex';
  };

  UI.fillEditor = function (type, id) {
    var item = TL.model.getByType(type, id);
    if (!item) return;
    $('editor-head').textContent = { event: '编辑事件', period: '编辑时段', era: '编辑纪元' }[type];
    $('f-title').value = item.title || item.name || '';
    $('f-period-toggle').checked = !!(type === 'event' && item.endDate != null);
    $('f-date').value = (type === 'event') ? (item.dateStr || TL.date.format(item.date))
      : (item.startStr || TL.date.format(item.start));
    $('f-enddate').value = (type === 'event') ? (item.endDateStr || (item.endDate != null ? TL.date.format(item.endDate) : ''))
      : (item.endStr || TL.date.format(item.end));
    $('f-category').value = item.categoryId || '';
    $('f-color').value = item.color || '#2f6fed';
    $('f-image').value = item.image || '';
    $('f-show-image').checked = item.showImage !== false;
    $('f-link').value = item.link || '';
    $('f-desc').value = item.description || '';
    $('row-enddate').style.display = (type === 'event') ? (item.endDate != null ? 'flex' : 'none') : 'flex';
    UI.updateImagePreview();
    UI.showError('');
  };

  UI.syncEditor = function () {
    // 正在输入时不打断
    var ae = document.activeElement;
    if (ae && ae.closest && ae.closest('.editor-body')) return;
    if (UI.mode === 'edit' && UI.id) {
      UI.layoutEditor(UI.type);
      UI.fillEditor(UI.type, UI.id);
    } else if (UI.mode === 'create') {
      // 保持当前填写内容
      UI.layoutEditor(UI.type);
    } else {
      UI.showEmptyEditor();
    }
  };

  UI.updateImagePreview = function () {
    var src = $('f-image').value.trim();
    var img = $('f-image-preview');
    if (src) { img.src = src; img.style.display = ''; }
    else { img.removeAttribute('src'); img.style.display = 'none'; }
  };

  UI.showError = function (msg) {
    var el = $('editor-error');
    if (msg) { el.textContent = msg; el.style.display = ''; }
    else { el.textContent = ''; el.style.display = 'none'; }
  };

  // ---------- 提交 / 删除 ----------
  UI.submit = function () {
    var type = UI.type;
    var title = $('f-title').value.trim();
    if (!title) { UI.showError('标题不能为空'); return; }

    var dateStr = $('f-date').value.trim();
    var date = TL.date.parse(dateStr);
    if (date == null) { UI.showError('日期无法解析：' + (dateStr || '空')); return; }

    var endStr = '', end = null;
    var needEnd = (type !== 'event') || $('f-period-toggle').checked;
    if (needEnd) {
      endStr = $('f-enddate').value.trim();
      end = TL.date.parse(endStr);
      if (end == null) { UI.showError('结束日期无法解析：' + (endStr || '空')); return; }
      if (end <= date) { UI.showError('结束日期必须晚于开始日期'); return; }
    }

    var common = {
      title: title,
      description: $('f-desc').value.trim(),
      categoryId: $('f-category').value || null,
      color: $('f-color').value
    };

    if (type === 'event') {
      var ev = {
        title: title,
        date: date, dateStr: dateStr,
        endDate: needEnd ? end : null, endDateStr: needEnd ? endStr : null,
        description: common.description,
        categoryId: common.categoryId,
        image: $('f-image').value.trim(),
        showImage: $('f-show-image').checked,
        link: $('f-link').value.trim()
      };
      if (UI.mode === 'edit') { TL.model.update('events', UI.id, ev); }
      else { var n1 = TL.model.add('events', ev); UI.id = n1.id; UI.mode = 'edit'; }
    } else if (type === 'period') {
      var pr = {
        name: title,
        start: date, startStr: dateStr,
        end: end, endStr: endStr,
        description: common.description,
        categoryId: common.categoryId
      };
      if (UI.mode === 'edit') { TL.model.update('periods', UI.id, pr); }
      else { var n2 = TL.model.add('periods', pr); UI.id = n2.id; UI.mode = 'edit'; }
    } else if (type === 'era') {
      var er = { name: title, start: date, startStr: dateStr, end: end, endStr: endStr, color: common.color };
      if (UI.mode === 'edit') { TL.model.update('eras', UI.id, er); }
      else { var n3 = TL.model.add('eras', er); UI.id = n3.id; UI.mode = 'edit'; }
    }

    UI.select(UI.type, UI.id);
  };

  UI.deleteSelected = function () {
    if (UI.mode !== 'edit' || !UI.id) return;
    if (!confirm('删除这个' + ({ event: '事件', period: '时段', era: '纪元' }[UI.type] || '元素') + '？')) return;
    var map = { event: 'events', period: 'periods', era: 'eras' };
    TL.model.remove(map[UI.type], UI.id);
    UI.select(null, null);
  };

  // ---------- 类别 ----------
  UI.rebuildCategories = function () {
    var s = TL.model.get();
    var box = $('cat-list');
    box.innerHTML = '';
    s.categories.forEach(function (c) {
      var row = document.createElement('div');
      row.className = 'cat-item';
      var dot = document.createElement('span'); dot.className = 'dot'; dot.style.background = c.color;
      var n = document.createElement('span'); n.className = 'n'; n.textContent = c.name;
      var x = document.createElement('button'); x.className = 'x'; x.textContent = '×';
      x.title = '删除类别';
      x.addEventListener('click', function () {
        if (confirm('删除类别「' + c.name + '」？其下元素将使用默认颜色。')) {
          TL.model.remove('categories', c.id);
        }
      });
      row.appendChild(dot); row.appendChild(n); row.appendChild(x);
      box.appendChild(row);
    });

    // f-category 下拉
    var sel = $('f-category');
    var cur = sel.value;
    sel.innerHTML = '';
    if (!s.categories.length) {
      var o0 = document.createElement('option'); o0.value = ''; o0.textContent = '（无类别）';
      sel.appendChild(o0);
    }
    s.categories.forEach(function (c) {
      var o = document.createElement('option'); o.value = c.id; o.textContent = c.name;
      sel.appendChild(o);
    });
    if (cur) sel.value = cur;

    // 浏览过滤下拉
    var filt = $('cat-filter');
    var curF = filt.value;
    filt.innerHTML = '';
    var all = document.createElement('option'); all.value = ''; all.textContent = '全部类别';
    filt.appendChild(all);
    s.categories.forEach(function (c) {
      var o = document.createElement('option'); o.value = c.id; o.textContent = c.name;
      filt.appendChild(o);
    });
    filt.value = curF;
  };

  UI.addCategory = function () {
    var name = $('new-cat-name').value.trim();
    if (!name) return;
    var color = $('new-cat-color').value;
    // 重名检查
    var s = TL.model.get();
    if (s.categories.some(function (c) { return c.name === name; })) { alert('类别名已存在'); return; }
    TL.model.add('categories', { id: TL.model.uid(), name: name, color: color });
    $('new-cat-name').value = '';
  };

  // ---------- 列表 ----------
  UI.rebuildList = function () {
    var s = TL.model.get();
    var q = $('search').value.trim().toLowerCase();
    var fcat = $('cat-filter').value;
    var R = TL.render;

    function matchText(t) { return !q || (t && t.toLowerCase().indexOf(q) >= 0); }

    var eraList = $('era-list');
    eraList.innerHTML = '';
    s.eras.slice().sort(function (a, b) { return a.start - b.start; }).forEach(function (er) {
      if (!matchText(er.name)) return;
      var it = makeItem('era', er.id, er.color, 'bar', er.name, TL.date.format(er.start) + ' — ' + TL.date.format(er.end), null);
      eraList.appendChild(it);
    });

    var perList = $('period-list');
    perList.innerHTML = '';
    s.periods.slice().sort(function (a, b) { return a.start - b.start; }).forEach(function (p) {
      if (fcat && p.categoryId !== fcat) return;
      if (!matchText(p.name + ' ' + (p.description || ''))) return;
      var c = TL.model.itemColor(p);
      perList.appendChild(makeItem('period', p.id, c, 'bar', p.name, TL.date.format(p.start) + ' — ' + TL.date.format(p.end), null));
    });

    var evList = $('event-list');
    evList.innerHTML = '';
    s.events.slice().sort(function (a, b) { return a.date - b.date; }).forEach(function (e) {
      if (fcat && e.categoryId !== fcat) return;
      if (!matchText(e.title + ' ' + (e.description || ''))) return;
      var c = TL.model.itemColor(e);
      evList.appendChild(makeItem('event', e.id, c, 'dot', e.title, TL.date.format(e.date), e.image));
    });
  };

  function makeItem(type, id, color, shape, title, dateStr, thumb) {
    var el = document.createElement('div');
    el.className = 'item' + (Rsel(type, id) ? ' active' : '');
    var dot = document.createElement('span');
    dot.className = shape === 'dot' ? 'dot' : 'bar';
    dot.style.background = color;
    el.appendChild(dot);
    if (thumb) {
      var im = document.createElement('img'); im.className = 'thumb'; im.src = thumb;
      el.appendChild(im);
    }
    var t = document.createElement('span'); t.className = 't'; t.textContent = title; t.title = title;
    var d = document.createElement('span'); d.className = 'd'; d.textContent = dateStr;
    el.appendChild(t); el.appendChild(d);
    el.addEventListener('click', function () { UI.select(type, id); });
    return el;
  }

  function Rsel(type, id) { return TL.render.selection && TL.render.selection.type === type && TL.render.selection.id === id; }

  TL.ui = UI;
})();
