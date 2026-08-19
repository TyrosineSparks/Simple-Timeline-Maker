/* 全量启动冒烟测试：用 DOM/Canvas 桩模拟浏览器，跑完整个 main.js 启动流程 */
'use strict';

function makeCtx() {
  var ctx = {
    fillStyle: '', strokeStyle: '', lineWidth: 1, font: '', textAlign: '', textBaseline: '', globalAlpha: 1,
    setTransform() {}, clearRect() {}, fillRect() {}, strokeRect() {},
    beginPath() {}, closePath() {}, moveTo() {}, lineTo() {}, arc() {}, arcTo() {}, rect() {},
    stroke() {}, fill() {}, save() {}, restore() {}, clip() {}, drawImage() {},
    fillText() {}, strokeText() {},
    measureText(t) { return { width: String(t).length * 7 }; }
  };
  return ctx;
}
function makeEl(tag) {
  var el = {
    tagName: (tag || 'div').toUpperCase(),
    style: {},
    classList: { add() {}, remove() {}, contains() { return false; } },
    children: [], listeners: {},
    value: '', innerHTML: '', textContent: '', disabled: false, checked: false,
    width: 0, height: 0, src: '', href: '', download: '',
    addEventListener(ev, fn) { (this.listeners[ev] = this.listeners[ev] || []).push(fn); },
    removeEventListener() {},
    appendChild(c) { this.children.push(c); return c; },
    removeChild(c) { var i = this.children.indexOf(c); if (i >= 0) this.children.splice(i, 1); return c; },
    setAttribute() {}, removeAttribute() {}, focus() {}, click() {},
    closest() { return null; },
    getBoundingClientRect() { return { width: 800, height: 600, left: 0, top: 0 }; },
    setPointerCapture() {}, releasePointerCapture() {}
  };
  if (tag === 'canvas') el.getContext = function () { return makeCtx(); };
  return el;
}

var ids = {};
function getEl(id) {
  if (!ids[id]) {
    if (id === 'tl') ids[id] = makeEl('canvas');
    else ids[id] = makeEl('div');
  }
  return ids[id];
}

var documentStub = {
  getElementById: getEl,
  createElement: function (tag) { return makeEl(tag); },
  body: makeEl('body'),
  addEventListener() {},
  activeElement: null
};

global.window = { devicePixelRatio: 1, addEventListener() {}, open() { return null; } };
global.document = documentStub;
global.localStorage = { _s: {}, getItem(k) { return this._s[k] || null; }, setItem(k, v) { this._s[k] = v; }, removeItem(k) { delete this._s[k]; } };
global.confirm = function () { return true; };
global.alert = function () {};
global.FileReader = function () { this.readAsDataURL = function () {}; this.readAsText = function () {}; };
global.Blob = function () {};
global.URL = { createObjectURL() { return ''; }, revokeObjectURL() {} };
global.Image = function () { this.complete = false; this.naturalWidth = 0; this.onload = null; this.onerror = null; };

var files = ['dateutil.js', 'model.js', 'sample.js', 'render.js', 'interaction.js', 'ui.js', 'export.js', 'main.js'];
files.forEach(function (f) { require('../js/' + f); });

var TL = global.window.TL;
var failed = 0;
function check(cond, label) {
  if (!cond) { failed++; console.log('FAIL', label); } else console.log('ok  ', label);
}

check(!!TL.render.metrics, '启动后渲染度量已建立');
check(TL.model.get().events.length === 13, '示例已载入 (13 事件)');
check(TL.render.hits.length > 0, '命中区域已生成 (' + TL.render.hits.length + ')');
check(TL.render.selection && TL.render.selection.type === null, '初始无选中');

// 交互路径
var firstEvent = TL.model.get().events[0];
TL.ui.select('event', firstEvent.id);
check(TL.render.selection.type === 'event', '选中事件');
TL.ui.newItem('period');
check(TL.ui.mode === 'create' && TL.ui.type === 'period', '新建时段表单');
TL.ui.newItem('era');
check(TL.ui.mode === 'create' && TL.ui.type === 'era', '新建纪元表单');
TL.ui.select(null, null);
check(TL.render.selection.type === null, '取消选中');

// 命中测试 + 视图操作
var hit = TL.render.hitTest(0, 0);
check(hit === null || typeof hit === 'object', 'hitTest 返回合理值');
TL.render.zoomBy(2, 400); TL.ui.refresh(true);
check(isFinite(TL.render.view.t0), '缩放后视图有效');
TL.render.fit(); TL.ui.refresh(true);
check(TL.render.view.t0 < TL.render.view.t1, '适配后视图有效');

// 导出规范化
var norm = TL.export.normalize(TL.model.get());
check(norm.events.length === 13 && norm.title, 'normalize 通过');

console.log(failed ? ('\n' + failed + ' 项失败') : '\n启动冒烟测试全部通过 ✅');
process.exit(failed ? 1 : 0);
