/* model.js — 数据模型 + 撤销/重做 + 变更通知 */
(function () {
  'use strict';
  var TL = window.TL = window.TL || {};
  var M = {};

  var state = null;
  var undoStack = [];
  var redoStack = [];
  var listeners = [];
  var _uid = 1;

  function snapshot() { return JSON.parse(JSON.stringify(state)); }
  function emit() { listeners.forEach(function (fn) { fn(); }); }

  // 兼容单/复数键：event/events、period/periods、era/eras、category/categories
  function key(type) {
    if (type === 'event') return 'events';
    if (type === 'period') return 'periods';
    if (type === 'era') return 'eras';
    if (type === 'category') return 'categories';
    return type;
  }

  M.uid = function () { return 'id' + (Date.now().toString(36)) + (_uid++).toString(36); };

  M.onChange = function (fn) { listeners.push(fn); };

  M.get = function () { return state; };

  M.setState = function (newState) {
    state = JSON.parse(JSON.stringify(newState));
    undoStack = []; redoStack = [];
    emit();
  };

  M.reset = function () {
    state = { title: '我的时间线', categories: [], eras: [], periods: [], events: [] };
    undoStack = []; redoStack = [];
    emit();
  };

  M.setTitle = function (t) {
    if (!state) return;
    pushHistory();
    state.title = t || '我的时间线';
    emit();
  };

  function pushHistory() {
    undoStack.push(snapshot());
    if (undoStack.length > 120) undoStack.shift();
    redoStack = [];
  }

  // 在一次连续拖拽前调用，只记一次快照
  M.beginUndo = function () { pushHistory(); };

  M.add = function (type, obj) {
    pushHistory();
    state[key(type)].push(obj);
    emit();
    return obj;
  };

  M.update = function (type, id, patch, record) {
    var arr = state[key(type)];
    for (var i = 0; i < arr.length; i++) {
      if (arr[i].id === id) {
        if (record !== false) pushHistory();
        for (var k in patch) arr[i][k] = patch[k];
        emit();
        return arr[i];
      }
    }
    return null;
  };

  M.remove = function (type, id) {
    var arr = state[key(type)];
    for (var i = 0; i < arr.length; i++) {
      if (arr[i].id === id) {
        pushHistory();
        arr.splice(i, 1);
        emit();
        return true;
      }
    }
    return false;
  };

  M.undo = function () {
    if (!undoStack.length) return false;
    redoStack.push(snapshot());
    state = undoStack.pop();
    emit();
    return true;
  };

  M.redo = function () {
    if (!redoStack.length) return false;
    undoStack.push(snapshot());
    state = redoStack.pop();
    emit();
    return true;
  };

  M.canUndo = function () { return undoStack.length > 0; };
  M.canRedo = function () { return redoStack.length > 0; };

  M.getByType = function (type, id) {
    var arr = state[key(type)];
    for (var i = 0; i < arr.length; i++) if (arr[i].id === id) return arr[i];
    return null;
  };

  // 类别
  M.defaultCategory = function () {
    if (state.categories.length) return state.categories[0].id;
    var c = M.add('categories', { id: M.uid(), name: '默认', color: '#2f6fed' });
    return c.id;
  };
  M.categoryColor = function (id) {
    for (var i = 0; i < state.categories.length; i++) if (state.categories[i].id === id) return state.categories[i].color;
    return '#2f6fed';
  };
  M.itemColor = function (item) {
    if (item && item.color) return item.color;
    if (item && item.categoryId) return M.categoryColor(item.categoryId);
    return '#2f6fed';
  };

  // 数据时间范围（含事件/时段/纪元）
  M.bounds = function () {
    var s = state;
    var lo = Infinity, hi = -Infinity;
    function acc(v) { if (v != null && isFinite(v)) { if (v < lo) lo = v; if (v > hi) hi = v; } }
    s.events.forEach(function (e) { acc(e.date); if (e.endDate != null) acc(e.endDate); });
    s.periods.forEach(function (p) { acc(p.start); acc(p.end); });
    s.eras.forEach(function (er) { acc(er.start); acc(er.end); });
    if (lo === Infinity) { lo = 1900; hi = 2000; }
    if (hi - lo < 1) { hi = lo + 1; }
    return { lo: lo, hi: hi };
  };

  TL.model = M;
})();
