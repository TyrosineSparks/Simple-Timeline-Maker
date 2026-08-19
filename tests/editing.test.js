/* 编辑链路自测：创建 → 选中 → 修改 → 保存，覆盖事件/时段/纪元 */
'use strict';
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

['dateutil.js', 'model.js', 'sample.js', 'render.js', 'interaction.js', 'ui.js', 'export.js', 'main.js'].forEach(function (f) { require('../js/' + f); });
var TL = global.window.TL;
var UI = TL.ui;
var M = TL.model;
var $ = function (id) { return document.getElementById(id); };

var failed = 0;
function check(cond, label) { if (!cond) { failed++; console.log('FAIL', label); } else console.log('ok  ', label); }

// ===== 事件：创建 → 编辑 =====
UI.newItem('event');
$('f-title').value = '测试事件';
$('f-date').value = '2000';
UI.submit();
var ev = M.get().events.filter(function (e) { return e.title === '测试事件'; })[0];
check(!!ev, '事件创建成功');
check(M.get().events.length === 14, '事件总数 = 14');

UI.select('event', ev.id);
check(UI.mode === 'edit', '选中事件后进入编辑模式');
check($('f-title').value === '测试事件', '表单回填标题');
check($('f-date').value === '2000', '表单回填日期');

$('f-title').value = '改过的事件';
$('f-desc').value = '新描述';
UI.submit();
var ev2 = M.getByType('event', ev.id);
check(ev2.title === '改过的事件', '事件标题已更新');
check(ev2.description === '新描述', '事件描述已更新');

// ===== 时段：创建 → 编辑 =====
UI.newItem('period');
$('f-title').value = '测试时段';
$('f-date').value = '1000';
$('f-enddate').value = '1500';
UI.submit();
var pr = M.get().periods.filter(function (p) { return p.name === '测试时段'; })[0];
check(!!pr, '时段创建成功');

UI.select('period', pr.id);
check($('f-title').value === '测试时段', '时段表单回填名称');
$('f-title').value = '改过的时段';
UI.submit();
var pr2 = M.getByType('period', pr.id);
check(pr2.name === '改过的时段', '时段名称已更新');

// ===== 纪元：创建 → 编辑 =====
UI.newItem('era');
$('f-title').value = '测试纪元';
$('f-date').value = '-1000';
$('f-enddate').value = '0';
UI.submit();
var er = M.get().eras.filter(function (x) { return x.name === '测试纪元'; })[0];
check(!!er, '纪元创建成功');

UI.select('era', er.id);
check($('f-title').value === '测试纪元', '纪元表单回填名称');
$('f-title').value = '改过的纪元';
UI.submit();
var er2 = M.getByType('era', er.id);
check(er2.name === '改过的纪元', '纪元名称已更新');

console.log(failed ? ('\n' + failed + ' 项失败') : '\n编辑链路测试全部通过 ✅');
process.exit(failed ? 1 : 0);
