/* sample.js — 示例数据：世界历史时间线 */
(function () {
  'use strict';
  var TL = window.TL = window.TL || {};

  var Y = TL.date.parse;

  TL.sample = function () {
    var cats = [
      { id: 'cat-politics', name: '政治', color: '#2f6fed' },
      { id: 'cat-war', name: '战争', color: '#e5484d' },
      { id: 'cat-science', name: '科技', color: '#0fa968' },
      { id: 'cat-culture', name: '文化', color: '#a855f7' }
    ];

    var eras = [
      { id: 'era-ancient', name: '古代', start: Y('-3000'), end: Y('500'), color: '#b99a5f' },
      { id: 'era-medieval', name: '中世纪', start: Y('500'), end: Y('1500'), color: '#8a7f8d' },
      { id: 'era-early', name: '近代早期', start: Y('1500'), end: Y('1800'), color: '#5f8fb9' },
      { id: 'era-modern', name: '现代', start: Y('1800'), end: Y('2030'), color: '#4aa3df' }
    ];

    var periods = [
      { id: 'per-rome', name: '罗马帝国', start: Y('27 BCE'), end: Y('476'), categoryId: 'cat-politics', description: '横跨欧亚非的帝国' },
      { id: 'per-ming', name: '明朝', start: Y('1368'), end: Y('1644'), categoryId: 'cat-politics', description: '中国历史上最后一个由汉族建立的大一统王朝' },
      { id: 'per-industry', name: '工业革命', start: Y('1760'), end: Y('1840'), categoryId: 'cat-science', description: '机器生产取代手工劳动' },
      { id: 'per-ww2', name: '第二次世界大战', start: Y('1939'), end: Y('1945'), categoryId: 'cat-war', description: '全球规模最大的战争' }
    ];

    var events = [
      { id: 'ev-pyramid', title: '胡夫金字塔建成', date: Y('-2560'), categoryId: 'cat-culture', description: '古埃及第四王朝法老胡夫的陵墓' },
      { id: 'ev-confucius', title: '孔子诞生', date: Y('-551'), categoryId: 'cat-culture', description: '儒家学派创始人' },
      { id: 'ev-paper', title: '蔡伦改进造纸术', date: Y('105'), categoryId: 'cat-science', description: '东汉，造纸术成熟并推广' },
      { id: 'ev-gutenberg', title: '古腾堡印刷机', date: Y('1440'), categoryId: 'cat-science', description: '活字印刷，开启信息传播革命' },
      { id: 'ev-columbus', title: '哥伦布到达美洲', date: Y('1492'), categoryId: 'cat-politics', description: '开启大航海时代' },
      { id: 'ev-usa', title: '《独立宣言》发表', date: Y('1776'), categoryId: 'cat-politics', description: '美利坚合众国宣告独立' },
      { id: 'ev-marx', title: '《共产党宣言》发表', date: Y('1848'), categoryId: 'cat-politics', description: '马克思与恩格斯' },
      { id: 'ev-telephone', title: '贝尔发明电话', date: Y('1876'), categoryId: 'cat-science' },
      { id: 'ev-einstein', title: '爱因斯坦提出相对论', date: Y('1905'), categoryId: 'cat-science', description: '狭义相对论' },
      { id: 'ev-ww1', title: '第一次世界大战爆发', date: Y('1914'), categoryId: 'cat-war' },
      { id: 'ev-moon', title: '阿波罗11号登月', date: Y('1969-07-20'), categoryId: 'cat-science', description: '人类首次踏上月球' },
      { id: 'ev-berlin', title: '柏林墙倒塌', date: Y('1989-11-09'), categoryId: 'cat-politics' },
      { id: 'ev-www', title: '万维网诞生', date: Y('1991'), categoryId: 'cat-science', description: '蒂姆·伯纳斯-李发布 World Wide Web' }
    ];

    return {
      title: '世界历史时间线',
      categories: cats,
      eras: eras,
      periods: periods,
      events: events
    };
  };
})();
