#!/usr/bin/env node
/**
 * 校验 src/i18n/en.json 与 zh.json：
 *   1. key 集合必须完全一致（EN 是 authoritative）
 *   2. 不允许空值
 *   3. 两边完全相同的值视为"疑似未翻译"，只警告不失败（品牌名等允许相同）
 *
 * 退出码：0 通过；1 有缺失 key 或空值。
 */
import fs from 'node:fs';
import path from 'node:path';

/** 从当前目录向上找项目根（含 src/i18n/en.json），不依赖 skill 装在哪里 */
function findRoot(start) {
  let dir = start;
  for (;;) {
    if (fs.existsSync(path.join(dir, 'src/i18n/en.json'))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
}

const root = findRoot(process.cwd());
if (!root) {
  console.error('✗ 找不到项目根：请先 cd 到官网项目目录再运行');
  process.exit(1);
}
const enPath = path.join(root, 'src/i18n/en.json');
const zhPath = path.join(root, 'src/i18n/zh.json');

function flat(obj, prefix = '', out = new Map()) {
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) flat(v, key, out);
    else out.set(key, String(v ?? ''));
  }
  return out;
}

for (const p of [enPath, zhPath]) {
  if (!fs.existsSync(p)) {
    console.error(`✗ 找不到 ${path.relative(root, p)}`);
    process.exit(1);
  }
}

const en = flat(JSON.parse(fs.readFileSync(enPath, 'utf-8')));
const zh = flat(JSON.parse(fs.readFileSync(zhPath, 'utf-8')));

const missingZh = [...en.keys()].filter((k) => !zh.has(k));
const missingEn = [...zh.keys()].filter((k) => !en.has(k));
const empty = [];
for (const [k, v] of en) if (!v.trim()) empty.push(`en:${k}`);
for (const [k, v] of zh) if (!v.trim()) empty.push(`zh:${k}`);

const same = [...en.entries()]
  .filter(([k, v]) => zh.has(k) && v.trim() && v === zh.get(k))
  .map(([k]) => k);

const show = (arr, n = 10) =>
  arr.length ? arr.slice(0, n).join('\n    ') + (arr.length > n ? `\n    …共 ${arr.length} 项` : '') : '';

console.log(`en ${en.size} 键 / zh ${zh.size} 键`);

let failed = false;
if (missingZh.length) {
  failed = true;
  console.log(`✗ zh.json 缺少 ${missingZh.length} 个键:\n    ${show(missingZh)}`);
}
if (missingEn.length) {
  failed = true;
  console.log(`✗ en.json 缺少 ${missingEn.length} 个键:\n    ${show(missingEn)}`);
}
if (empty.length) {
  failed = true;
  console.log(`✗ 空值 ${empty.length} 处:\n    ${show(empty)}`);
}
if (same.length) {
  console.log(`⚠ ${same.length} 个键 en/zh 文案完全相同（确认不是漏翻）:\n    ${show(same, 8)}`);
}

if (failed) process.exit(1);
console.log('✓ i18n 校验通过');
