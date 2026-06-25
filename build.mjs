// ============================================================================
//  build.mjs — Bundle the modular source into a single self-contained
//  index.html that runs from file:// with no server and no internet.
//
//  Usage:  npm i -D esbuild   (once)   then   node build.mjs
//
//  Resolves Three.js from the local js/vendor/ copy via an esbuild plugin,
//  so the build works fully offline.
// ============================================================================
import { build } from 'esbuild';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const ROOT = dirname(fileURLToPath(import.meta.url));
const VENDOR = resolve(ROOT, 'js/vendor');

// Map bare "three" / "three/addons/*" specifiers onto the vendored files.
const vendorThree = {
  name: 'vendor-three',
  setup(b) {
    b.onResolve({ filter: /^three$/ }, () => ({ path: resolve(VENDOR, 'three.module.js') }));
    b.onResolve({ filter: /^three\/addons\// }, (args) => ({
      path: resolve(VENDOR, 'jsm', args.path.replace('three/addons/', '')),
    }));
  },
};

const result = await build({
  entryPoints: [resolve(ROOT, 'js/main.js')],
  bundle: true,
  format: 'iife',
  minify: true,
  legalComments: 'none',
  write: false,
  plugins: [vendorThree],
});

const bundle = result.outputFiles[0].text;
if (bundle.includes('</scr' + 'ipt')) throw new Error('Bundle contains a script-closing sequence; cannot inline safely.');

const css = readFileSync(resolve(ROOT, 'css/styles.css'), 'utf8');
let html = readFileSync(resolve(ROOT, 'index.src.html'), 'utf8');

// NOTE: use replacement *functions* everywhere — a string replacement would let
// `$&`, `$$`, etc. inside the minified CSS/JS be interpreted as match patterns
// and corrupt the output.

// Inline the stylesheet.
html = html.replace(
  '  <link rel="stylesheet" href="css/styles.css" />',
  () => `  <style>\n${css}\n  </style>`,
);

// Drop the dev import map and replace the module <script> with the inline bundle.
html = html.replace(/\s*<script type="importmap">[\s\S]*?<\/script>/, '');
html = html.replace(
  '  <script type="module" src="js/main.js"></script>',
  () => `  <script>\n${bundle}\n  </${'script'}>`,
);

// Refresh the dev-only comment.
html = html.replace(
  /  <!--\s*DEV SOURCE[\s\S]*?-->/,
  () => `  <!--\n    Fully self-contained single-file build — no server, no build step, no\n    internet required. Just open this file in a browser. Three.js, all game\n    code, and all styles are inlined below. Edit the source in /js and /css,\n    then run \`node build.mjs\` to regenerate this file.\n  -->`,
);

writeFileSync(resolve(ROOT, 'index.html'), html);
console.log(`Built index.html — ${(html.length / 1024).toFixed(0)}kb, fully self-contained.`);
