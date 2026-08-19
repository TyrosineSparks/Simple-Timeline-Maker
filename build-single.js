/* build-single.js — 把多文件应用打包成单个自包含 HTML（用于 Notion / htmlsave / 静态托管嵌入） */
'use strict';
var fs = require('fs');
var path = require('path');
var root = __dirname;

var html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

// 内联 CSS
var css = fs.readFileSync(path.join(root, 'css', 'style.css'), 'utf8');
html = html.replace(
  /<link rel="stylesheet" href="css\/style\.css"[^>]*>/,
  '<style>\n' + css + '\n</style>'
);

// 内联所有 JS（保持原有顺序）
var count = 0;
html = html.replace(/<script src="js\/([^"]+)"><\/script>/g, function (match, name) {
  var code = fs.readFileSync(path.join(root, 'js', name), 'utf8');
  count++;
  return '<script>\n' + code + '\n</script>';
});

var dist = path.join(root, 'dist');
if (!fs.existsSync(dist)) fs.mkdirSync(dist);
var out = path.join(dist, 'timeline.single.html');
fs.writeFileSync(out, html);

console.log('内联脚本数:', count);
console.log('生成:', out, '(' + html.length + ' bytes)');
if (count !== 8) { console.error('警告：内联脚本数不为 8，请检查 index.html 的 <script> 标签'); process.exit(1); }
