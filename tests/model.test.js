/* 模型 + 示例数据自测（Node，无 DOM 依赖） */
global.window = {};
require('../js/dateutil.js');
require('../js/model.js');
require('../js/sample.js');
var M = window.TL.model;

M.setState(window.TL.sample());
var s = M.get();
var failed = 0;
function check(cond, label) {
  if (!cond) { failed++; console.log('FAIL', label); } else console.log('ok  ', label);
}

check(s.title === '世界历史时间线', '示例标题');
check(s.categories.length === 4, '4 个类别');
check(s.eras.length === 4, '4 个纪元');
check(s.periods.length === 4, '4 个时段');
check(s.events.length === 13, '13 个事件');

s.eras.forEach(function (er) { check(er.start < er.end, '纪元范围合理: ' + er.name); });
s.periods.forEach(function (p) { check(p.start < p.end, '时段范围合理: ' + p.name); });
s.events.forEach(function (e) { check(isFinite(e.date), '事件日期有效: ' + e.title); });

// bounds
var b = M.bounds();
check(isFinite(b.lo) && isFinite(b.hi) && b.lo < b.hi, 'bounds 有效 (' + b.lo + '..' + b.hi + ')');
console.log('bounds:', b.lo, '→', b.hi);

// 撤销重做
var before = s.events.length;
var ev = M.add('events', { id: M.uid(), title: '测试', date: 2000, dateStr: '2000', categoryId: s.categories[0].id });
check(M.get().events.length === before + 1, 'add 增加事件');
check(M.canUndo(), '可撤销');
M.undo();
check(M.get().events.length === before, 'undo 恢复数量');
check(M.canRedo(), '可重做');
M.redo();
check(M.get().events.length === before + 1, 'redo 再次增加');
M.undo();

// itemColor 回退
check(M.itemColor({ categoryId: s.categories[0].id }) === s.categories[0].color, 'itemColor 取类别色');
check(M.itemColor({ color: '#123456', categoryId: s.categories[0].id }) === '#123456', 'itemColor 优先自身色');

console.log(failed ? ('\n' + failed + ' 项失败') : '\n全部通过 ✅');
process.exit(failed ? 1 : 0);
