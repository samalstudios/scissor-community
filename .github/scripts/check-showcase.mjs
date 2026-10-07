#!/usr/bin/env node
// Checks every entry in showcase/ against the rules in showcase/README.md.
//
//   node .github/scripts/check-showcase.mjs [folder]     # default: showcase
//   PR_BODY="…" node .github/scripts/check-showcase.mjs --checklist
//
// The second form checks that a pull request adding or changing an entry
// ticks every item of .github/PULL_REQUEST_TEMPLATE/showcase.md in its
// description. Prints each problem (as a GitHub annotation inside Actions) and
// exits 1 when there is any. Plain Node, no dependencies.
import { execFileSync } from 'node:child_process';
import { existsSync, lstatSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { gunzipSync } from 'node:zlib';

const ROOT = process.argv[2] ?? 'showcase';
const TEMPLATE = '.github/PULL_REQUEST_TEMPLATE/showcase.md';

const MAX_PREVIEW_BYTES = 1_000_000;
const MAX_PREVIEW_SIDE = 1600;
const MAX_CUT_BYTES = 10_000_000;
const MAX_DOCUMENT_BYTES = 100_000_000;
const MAX_INFO_BYTES = 10_000;
const LICENCES = ['CC-BY-4.0', 'CC0-1.0'];
const KEYS = ['title', 'artist', 'artistUrl', 'description', 'licence', 'tags'];
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const CONTROL = /[\u0000-\u001f\u007f-\u009f]/;

const length = (s) => [...s].length;

function text(info, key, max, errors, required) {
  const value = info[key];
  if (value === undefined && !required) return;
  if (typeof value !== 'string' || !value.trim()) errors.push(`"${key}" must be a non-empty string`);
  else if (length(value.trim()) > max) errors.push(`"${key}" is longer than ${max} characters`);
  else if (CONTROL.test(value)) errors.push(`"${key}" holds control characters (line breaks, tabs)`);
}

function checkInfo(bytes) {
  const errors = [];
  if (bytes.length > MAX_INFO_BYTES) return [`info.json is larger than ${MAX_INFO_BYTES} bytes`];
  let info;
  try {
    info = JSON.parse(bytes.toString('utf8'));
  } catch (e) {
    return [`info.json is not valid JSON (${e.message})`];
  }
  if (!info || typeof info !== 'object' || Array.isArray(info)) return ['info.json must hold one JSON object'];
  for (const key of Object.keys(info)) {
    if (!KEYS.includes(key)) errors.push(key === 'license' ? 'spell the field "licence"' : `unknown field "${key}"`);
  }
  text(info, 'title', 80, errors, true);
  text(info, 'artist', 80, errors, true);
  text(info, 'description', 280, errors, false);
  if (info.artistUrl !== undefined) {
    let url = null;
    try {
      url = typeof info.artistUrl === 'string' && info.artistUrl.length <= 200 ? new URL(info.artistUrl) : null;
    } catch {}
    if (!url || url.protocol !== 'https:' || url.username || url.password || !url.hostname.includes('.')) {
      errors.push('"artistUrl" must be an https:// address of at most 200 characters');
    }
  }
  if (!LICENCES.includes(info.licence)) errors.push(`"licence" must be one of ${LICENCES.join(', ')}`);
  if (info.tags !== undefined) {
    const ok =
      Array.isArray(info.tags) &&
      info.tags.length <= 10 &&
      info.tags.every((t) => typeof t === 'string' && t.trim() && length(t.trim()) <= 30 && !CONTROL.test(t));
    if (!ok) errors.push('"tags" must be a list of at most 10 words, each at most 30 characters');
  }
  return errors;
}

function pngSize(b) {
  const signature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  if (b.length < 33 || !signature.every((v, i) => b[i] === v) || b.toString('latin1', 12, 16) !== 'IHDR') return null;
  let animated = false;
  for (let at = 8; ; ) {
    if (at + 12 > b.length) return null;
    const type = b.toString('latin1', at + 4, at + 8);
    if (type === 'acTL') animated = true;
    if (type === 'IEND') break;
    at += 12 + b.readUInt32BE(at);
  }
  return { width: b.readUInt32BE(16), height: b.readUInt32BE(20), animated };
}

function webpSize(b) {
  if (b.length < 30 || b.toString('latin1', 0, 4) !== 'RIFF' || b.toString('latin1', 8, 12) !== 'WEBP') return null;
  if (b.readUInt32LE(4) + 8 > b.length) return null;
  const chunk = b.toString('latin1', 12, 16);
  if (chunk === 'VP8 ' && b[23] === 0x9d && b[24] === 0x01 && b[25] === 0x2a) {
    return { width: b.readUInt16LE(26) & 0x3fff, height: b.readUInt16LE(28) & 0x3fff, animated: false };
  }
  if (chunk === 'VP8L' && b[20] === 0x2f) {
    const bits = b.readUInt32LE(21);
    return { width: (bits & 0x3fff) + 1, height: ((bits >>> 14) & 0x3fff) + 1, animated: false };
  }
  if (chunk === 'VP8X') {
    return { width: b.readUIntLE(24, 3) + 1, height: b.readUIntLE(27, 3) + 1, animated: (b[20] & 0x02) !== 0 };
  }
  return null;
}

function checkPreview(bytes, name) {
  if (bytes.length >= MAX_PREVIEW_BYTES) return { errors: [`${name} must be under 1 MB (${MAX_PREVIEW_BYTES} bytes)`] };
  const size = name.endsWith('.png') ? pngSize(bytes) : webpSize(bytes);
  if (!size) return { errors: [`${name} is not a valid ${name.endsWith('.png') ? 'PNG' : 'WebP'} image`] };
  const errors = [];
  if (size.animated) errors.push(`${name} must not be animated`);
  if (!size.width || !size.height || Math.max(size.width, size.height) > MAX_PREVIEW_SIDE) {
    errors.push(`${name} is ${size.width}×${size.height}; its long side must be at most ${MAX_PREVIEW_SIDE} px`);
  }
  return { errors, width: size.width, height: size.height };
}

function checkCut(bytes) {
  if (bytes.length > MAX_CUT_BYTES) return [`artwork.cut is larger than ${MAX_CUT_BYTES / 1_000_000} MB`];
  let json;
  if (bytes.length >= 10 && bytes.toString('latin1', 0, 4) === 'SCUT') {
    const flags = bytes[5];
    const metaLen = bytes.readUInt32LE(6);
    if (bytes[4] !== 1 || flags & ~1 || metaLen > 4096 || 10 + metaLen > bytes.length) {
      return ['artwork.cut has a header Scissor does not recognise; save it again from Scissor'];
    }
    try {
      const meta = JSON.parse(bytes.toString('utf8', 10, 10 + metaLen));
      if (meta.app !== 'Scissor') throw new Error();
    } catch {
      return ['artwork.cut was not saved by Scissor'];
    }
    const payload = bytes.subarray(10 + metaLen);
    try {
      json = (flags & 1 ? gunzipSync(payload, { maxOutputLength: MAX_DOCUMENT_BYTES }) : payload).toString('utf8');
    } catch {
      return ['artwork.cut is damaged or too large once unpacked'];
    }
  } else {
    json = bytes.toString('utf8');
  }
  let doc;
  try {
    doc = JSON.parse(json);
  } catch {
    return ['artwork.cut is not a Scissor document'];
  }
  if (!doc || doc.format !== 'scissor' || !Array.isArray(doc.artboards) || !doc.artboards.length) {
    return ['artwork.cut is not a Scissor document with an artboard'];
  }
  const stack = [doc];
  while (stack.length) {
    const value = stack.pop();
    if (Array.isArray(value)) {
      for (const v of value) if (v && typeof v === 'object') stack.push(v);
      continue;
    }
    for (const [key, v] of Object.entries(value)) {
      if (key === 'href' && !(typeof v === 'string' && v.startsWith('data:image/'))) {
        return ['artwork.cut links to an outside file; embed every image in the document'];
      }
      if (v && typeof v === 'object') stack.push(v);
    }
  }
  return [];
}

const FILES = ['artwork.cut', 'info.json', 'preview.png', 'preview.webp'];

function checkEntry(dir, slug) {
  const errors = [];
  if (!SLUG.test(slug) || slug.length > 64) {
    errors.push('folder names use lowercase letters, digits and single hyphens (at most 64 characters)');
  }
  const names = readdirSync(dir);
  for (const name of names) {
    if (!FILES.includes(name)) errors.push(`${name} does not belong here: only artwork.cut, info.json and preview.webp or preview.png`);
    else if (!lstatSync(join(dir, name)).isFile()) errors.push(`${name} must be a plain file`);
  }
  for (const name of ['artwork.cut', 'info.json']) if (!names.includes(name)) errors.push(`${name} is missing`);
  const previews = names.filter((n) => n.startsWith('preview.') && FILES.includes(n));
  if (previews.length !== 1) errors.push('add exactly one preview: preview.webp or preview.png');
  if (errors.length) return errors;
  errors.push(...checkInfo(readFileSync(join(dir, 'info.json'))));
  errors.push(...checkPreview(readFileSync(join(dir, previews[0])), previews[0]).errors);
  errors.push(...checkCut(readFileSync(join(dir, 'artwork.cut'))));
  return errors;
}

const report = (path, message) => {
  const escaped = message.replace(/%/g, '%25').replace(/\r/g, '%0D').replace(/\n/g, '%0A');
  if (process.env.GITHUB_ACTIONS) console.log(`::error file=${path}::${escaped}`);
  else console.error(`${path}: ${message}`);
};

function checkChecklist() {
  let changed = null;
  try {
    changed = execFileSync('git', ['diff', '--name-only', '--diff-filter=d', 'HEAD^1', 'HEAD', '--', 'showcase'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });
  } catch {}
  if (changed !== null && !changed.split('\n').some((path) => /^showcase\/[^/]+\//.test(path))) {
    console.log('No showcase entry added or changed; no checklist needed');
    return;
  }
  const words = (line) => line.replace(/\s+/g, ' ').trim();
  const items = readFileSync(TEMPLATE, 'utf8')
    .split('\n')
    .map((line) => /^\s*- \[ \] (.+)$/.exec(line)?.[1])
    .filter(Boolean)
    .map(words);
  const ticked = new Set(
    (process.env.PR_BODY ?? '')
      .split(/\r\n|\r|\n/)
      .map((line) => /^\s*[-*] \[[xX]\] (.+)$/.exec(line)?.[1])
      .filter(Boolean)
      .map(words),
  );
  const missing = items.filter((item) => !ticked.has(item));
  if (!missing.length) {
    console.log(`All ${items.length} checklist items ticked`);
    return;
  }
  report(
    TEMPLATE,
    `Paste the showcase checklist into the pull request description unchanged and tick each item that is true. Not ticked: ${missing.map((m) => `"${m}"`).join(', ')}`,
  );
  process.exit(1);
}

if (process.argv[2] === '--checklist') {
  checkChecklist();
  process.exit(0);
}
if (!existsSync(ROOT)) {
  console.log(`${ROOT} does not exist; nothing to check`);
  process.exit(0);
}
let failed = 0;
let checked = 0;
for (const name of readdirSync(ROOT).sort()) {
  const path = join(ROOT, name);
  if (name === 'README.md') continue;
  if (!lstatSync(path).isDirectory()) {
    report(path, 'only entry folders and README.md belong in showcase/');
    failed++;
    continue;
  }
  checked++;
  const errors = checkEntry(path, name);
  for (const e of errors) report(path, e);
  if (errors.length) failed++;
}
if (failed) {
  console.error(`${failed} problem entr${failed === 1 ? 'y' : 'ies'}; see showcase/README.md`);
  process.exit(1);
}
console.log(`${checked} showcase entr${checked === 1 ? 'y' : 'ies'} checked, all good`);
