/* 日期逻辑自测（Node 环境，无 DOM 依赖） */
global.window = {};
require('../js/dateutil.js');
var D = window.TL.date;

var failed = 0;
function eq(actual, expected, label) {
  var ok = Math.abs(actual - expected) < 1e-6;
  if (!ok) { failed++; console.log('FAIL', label, '→ got', actual, 'expected', expected); }
  else console.log('ok  ', label, '=', actual);
}
function eqs(actual, expected, label) {
  var ok = actual === expected;
  if (!ok) { failed++; console.log('FAIL', label, '→ got', JSON.stringify(actual), 'expected', JSON.stringify(expected)); }
  else console.log('ok  ', label, '=', JSON.stringify(actual));
}

eq(D.parse('1945'), 1945, "parse('1945')");
eq(D.parse('300 BCE'), -299, "parse('300 BCE')");
eq(D.parse('300 BC'), -299, "parse('300 BC')");
eq(D.parse('-300'), -299, "parse('-300')");
eq(D.parse('27 BCE'), -26, "parse('27 BCE')");
eq(D.parse('AD 476'), 476, "parse('AD 476')");
eq(D.parse('公元476'), 476, "parse('公元476')");
eq(D.parse('前300年'), -299, "parse('前300年')");
eq(D.parse('1960s'), 1960, "parse('1960s')");
eq(D.parse('1945-08'), 1945 + 7 / 12, "parse('1945-08')");
eq(D.parse('1945-08-06'), 1945 + 7 / 12 + 5 / 365.25, "parse('1945-08-06')");
eq(D.parse('1949年'), 1949, "parse('1949年')");

eqs(D.format(-299), '300 BCE', "format(-299)");
eqs(D.format(1945), '1945', "format(1945)");
eqs(D.format(0), '1 BCE', "format(0)");
eqs(D.format(1), '1', "format(1)");
eqs(D.format(-26), '27 BCE', "format(-26)");
console.log('round-trip 1945-08-06 →', D.format(D.parse('1945-08-06')));

// 刻度
var tk = D.ticks(-3000, 2030, 1200 / 5030, 96);
console.log('ticks unit =', tk.unit, 'step =', tk.step, 'count =', tk.ticks.length);
console.log('sample labels:', tk.ticks.slice(0, 5).map(function (t) { return t.label; }).join(' | '));
if (tk.ticks.length < 3) { failed++; console.log('FAIL ticks too few'); }

console.log(failed ? ('\n' + failed + ' 项失败') : '\n全部通过 ✅');
process.exit(failed ? 1 : 0);
