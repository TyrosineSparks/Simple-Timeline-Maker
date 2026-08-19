/* dateutil.js — 日期解析、格式化、刻度生成（BCE/CE 天文年） */
(function () {
  'use strict';
  var TL = window.TL = window.TL || {};
  var D = {};

  var MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  // 天文年：1 CE = 1，1 BCE = 0，2 BCE = -1 …（内部统一用天文年）
  D.MONTHS = MONTHS;

  function pad(n) { return (n < 10 ? '0' : '') + n; }

  function astroYear(y) { return y <= 0 ? (1 - y) : y; }

  // 将"n BCE" 或负数 "-n" 转为天文年；neg/explicitBCE 任一为真即 BCE
  function toAstro(n, neg, explicitBCE) {
    if (neg || explicitBCE) return 1 - n;
    return n;
  }

  D.parse = function (input) {
    if (input == null) return null;
    var s = String(input).trim();
    if (!s) return null;

    // 模糊前缀
    s = s.replace(/^(c\.|ca\.?|circa|about|around|approx\.?|~|约|大约)\s*/i, '');
    s = s.replace(/[?？]$/, '').trim();
    if (!s) return null;

    // 今天/现在
    if (/^(today|now|今天|现在|present)$/i.test(s)) {
      var now = new Date();
      return now.getFullYear() + now.getMonth() / 12 + (now.getDate() - 1) / 365.25;
    }

    var explicitBCE = false;
    var m;

    // 后缀 BCE / BC / 公元前
    m = s.match(/^(.*?)\s*(B\.?\s*C\.?\s*E?\.?|B\.?\s*C\.?|公元前)$/i);
    if (m) { explicitBCE = true; s = m[1].trim(); }

    // 前缀 AD / 公元
    m = s.match(/^(A\.?\s*D\.?|公元)\s*(.+)$/i);
    if (m) s = m[2].trim();

    // 中文"前300年"
    m = s.match(/^前(\d+)年?$/);
    if (m) { explicitBCE = true; s = m[1]; }

    if (!s) return null;

    // 中文"1949年"
    m = s.match(/^(-?\d{1,6})年$/);
    if (m) s = m[1];

    // 十年 "1960s"
    m = s.match(/^(-?)(\d{3,4})s$/i);
    if (m) return toAstro(parseInt(m[2], 10), m[1] === '-', explicitBCE);

    // YYYY[-MM[-DD]] 或 YYYY年M月D日
    m = s.match(/^(-?)(\d{1,6})(?:[-/.年](\d{1,2}))?(?:[-/.月](\d{1,2}))?(?:日)?$/);
    if (m) {
      var neg = m[1] === '-';
      var y = parseInt(m[2], 10);
      var mo = m[3] ? parseInt(m[3], 10) : 0;
      var d = m[4] ? parseInt(m[4], 10) : 0;
      y = toAstro(y, neg, explicitBCE);
      var dec = y;
      if (mo) dec += (mo - 1) / 12;
      if (d) dec += (d - 1) / 365.25;
      return dec;
    }

    // 纯数字
    m = s.match(/^(-?)(\d+)$/);
    if (m) return toAstro(parseInt(m[2], 10), m[1] === '-', explicitBCE);

    return null;
  };

  // 格式化天文年小数为人类可读字符串
  D.format = function (t) {
    if (t == null || isNaN(t)) return '';
    var y = Math.floor(t);
    var frac = t - y;
    var moIdx = Math.floor(frac * 12);
    var day = Math.floor((frac * 12 - moIdx) * 30.44) + 1;
    var year = astroYear(y);
    var era = y <= 0 ? ' BCE' : '';

    if (frac < 1 / 24) return year + era;                    // 纯年份
    if (day <= 1) return MONTHS[moIdx] + ' ' + year + era;   // 只有月
    return year + '-' + pad(moIdx + 1) + '-' + pad(day) + era;
  };

  // 分解
  D.parts = function (t) {
    var y = Math.floor(t);
    var frac = t - y;
    var moIdx = Math.floor(frac * 12);
    var day = Math.floor((frac * 12 - moIdx) * 30.44) + 1;
    return { year: astroYear(y), era: y <= 0 ? 'BCE' : 'CE', month: moIdx + 1, monthName: MONTHS[moIdx], day: day };
  };

  // 1/2/5 × 10^n
  D.niceStep = function (raw) {
    if (raw <= 0) return 1;
    var mag = Math.pow(10, Math.floor(Math.log(raw) / Math.LN10));
    var norm = raw / mag;
    var nice;
    if (norm < 1.5) nice = 1;
    else if (norm < 3) nice = 2;
    else if (norm < 7) nice = 5;
    else nice = 10;
    return nice * mag;
  };

  // 刻度生成
  D.ticks = function (t0, t1, pxPerYear, targetGap) {
    targetGap = targetGap || 96;
    var raw = targetGap / pxPerYear;
    var step, unit;

    if (raw >= 1) { unit = 'year'; step = D.niceStep(raw); }
    else if (raw >= 1 / 12) { unit = 'month'; step = D.niceStep(raw * 12) / 12; }
    else if (raw >= 1 / 52) { unit = 'week'; step = D.niceStep(raw * 52) / 52; }
    else if (raw >= 1 / 365.25) { unit = 'day'; step = D.niceStep(raw * 365.25) / 365.25; }
    else { unit = 'hour'; step = D.niceStep(raw * 365.25 * 24) / (365.25 * 24); }

    var ticks = [];
    var k0 = Math.ceil(t0 / step - 1e-9);
    var k1 = Math.floor(t1 / step + 1e-9);
    for (var k = k0; k <= k1; k++) {
      var t = k * step;
      ticks.push({ t: t, label: D.tickLabel(t, unit) });
    }
    return { step: step, unit: unit, ticks: ticks };
  };

  D.tickLabel = function (t, unit) {
    var p = D.parts(t);
    switch (unit) {
      case 'year':
        return p.era === 'BCE' ? p.year + ' BCE' : String(p.year);
      case 'month':
        return p.monthName + ' ' + p.year + (p.era === 'BCE' ? ' BCE' : '');
      case 'week':
      case 'day':
        return p.monthName + ' ' + p.day + ' ' + p.year + (p.era === 'BCE' ? ' BCE' : '');
      case 'hour':
        var frac = t - Math.floor(t);
        var hour = Math.floor(frac * 24);
        return pad(hour) + ':00';
      default:
        return D.format(t);
    }
  };

  TL.date = D;
})();
