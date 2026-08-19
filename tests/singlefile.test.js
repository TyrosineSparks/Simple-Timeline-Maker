/* 单文件版启动冒烟测试：从 dist/timeline.single.html 提取内联脚本，用 DOM 桩执行并断言 */
'use strict';
var fs = require('fs');
var path = require('path');

function makeCtx() {
  return {
    fillStyle: '', strokeStyle: '', lineWidth: 1, font: '', textAlign: '', textBaseline: '', globalAlpha: 1,
    setTransform() {}, clearRect() {}, fillRect() {}, strokeRect() {},
    beginPath() {}, closePath() {}, moveTo() {}, lineTo() {}, arc() {}, arcTo() {}, rect() {},
    stroke() {}, fill() {}, save() {}, restore() {}, clip() {}, drawImage() {}, fillText() {}, strokeText() {},
    measureText(t) { return { width: String(t).length * 7 }; }
  };
}
function makeEl(tag) {
  var el = {
    tagName: (tag || 'div').toUpperCase(),
    style: {}, classList: { add() {}, remove() {}, contains() { return false; } },
    children: [], listeners: {}, value: '', innerHTML: '', textContent: '', disabled: false, checked: false,
    width: 0, height: 0, src: '', href: '', download: '',
    addEventListener(ev, fn) { (this.listeners[ev] = this.listeners[ev] || []).push(fn); },
    removeEventListener() {}, appendChild(c) { this.children.push(c); return c; },
    removeChild(c) { var i = this.children.indexOf(c); if (i >= 0) this.children.splice(i, 1); return c; },
    setAttribute() {}, removeAttribute() {}, focus() {}, click() {}, closest() { return null; },
    getBoundingClientRect() { return { width: 800, height: 600, left: 0, top: 0 }; },
    setPointerCapture() {}, releasePointerCapture() {}
  };
  if (tag === 'canvas') el.getContext = function () { return makeCtx(); };
  return el;
}
var ids = {};
function getEl(id) {
  if (!ids[id]) ids[id] = (id === 'tl') ? makeEl('canvas') : makeEl('div');
  return ids[id];
}
global.window = { devicePixelRatio: 1, addEventListener() {}, open() { return null; } };
global.document = { getElementById: getEl, createElement: function (t) { return makeEl(t); }, body: makeEl('body'), addEventListener() {}, activeElement: null };
global.localStorage = { _s: {}, getItem(k) { return this._s[k] || null; }, setItem(k, v) { this._s[k] = v; }, removeItem(k) { delete this._s[k]; } };
global.confirm = function () { return true; };
global.alert = function () {};
global.FileReader = function () { this.readAsDataURL = function () {}; this.readAsText = function () {}; };
global.Blob = function () {};
global.URL = { createObjectURL() { return ''; }, revokeObjectURL() {} };
global.Image = function () { this.complete = false; this.naturalWidth = 0; this.onload = null; this.onerror = null; };

var html = fs.readFileSync(path.join(__dirname, '..', 'dist', 'timeline.single.html'), 'utf8');
var scripts = [];
var re = /<script>([\s\S]*?)<\/script>/g;
var m;
while ((m = re.exec(html)) !== null) scripts.push(m[1]);

if (scripts.length !== 8) { console.error('FAIL 内联脚本数 =', scripts.length, '（应为 8）'); process.exit(1); }
console.log('提取到内联脚本', scripts.length, '个');

scripts.forEach(function (code, i) { try { eval(code); } catch (e) { console.error('FAIL 第', i, '段脚本执行报错:', e.message); process.exit(1); } });

var TL = global.window.TL;
var failed = 0;
function check(cond, label) { if (!cond) { failed++; console.log('FAIL', label); } else console.log('ok  ', label); }

check(!!TL.render.metrics, '渲染度量已建立');
check(TL.model.get().events.length === 13, '示例已载入');
check(TL.render.hits.length > 0, '命中区域已生成 (' + TL.render.hits.length + ')');
TL.ui.select('event', TL.model.get().events[0].id);
check(TL.render.selection.type === 'event', '选中事件');
TL.render.fit(); TL.ui.refresh(true);
check(TL.render.view.t0 < TL.render.view.t1, '适配后视图有效');

console.log(failed ? ('\n' + failed + ' 项失败') : '\n单文件版冒烟测试通过 ✅');
process.exit(failed ? 1 : 0);
