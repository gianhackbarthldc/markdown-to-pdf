'use strict';

const fs = require('fs');
const path = require('path');

const GITHUB_CSS_PATH = require.resolve('github-markdown-css/github-markdown-light.css');
const PDF_CSS_PATH = path.join(__dirname, '..', 'assets', 'pdf.css');
const MERMAID_JS_PATH = require.resolve('mermaid/dist/mermaid.min.js');

const MONTSERRAT_WEIGHTS = [
  { weight: 400, file: 'montserrat-latin-400-normal.woff2' },
  { weight: 600, file: 'montserrat-latin-600-normal.woff2' },
  { weight: 700, file: 'montserrat-latin-700-normal.woff2' },
];

const githubCss = fs.readFileSync(GITHUB_CSS_PATH, 'utf8');
const pdfCss = fs.readFileSync(PDF_CSS_PATH, 'utf8');

let mermaidJsCache = null;
function getMermaidJs() {
  if (!mermaidJsCache) {
    mermaidJsCache = fs.readFileSync(MERMAID_JS_PATH, 'utf8');
  }
  return mermaidJsCache;
}

let fontFaceCssCache = null;
/**
 * Builds @font-face rules for Montserrat with the font files inlined as
 * base64, so the PDF renders consistently even without internet access.
 */
function getFontFaceCss() {
  if (!fontFaceCssCache) {
    fontFaceCssCache = MONTSERRAT_WEIGHTS.map(({ weight, file }) => {
      const fontPath = require.resolve(`@fontsource/montserrat/files/${file}`);
      const base64 = fs.readFileSync(fontPath).toString('base64');
      return `@font-face {
  font-family: 'Montserrat';
  font-style: normal;
  font-weight: ${weight};
  font-display: swap;
  src: url(data:font/woff2;charset=utf-8;base64,${base64}) format('woff2');
}`;
    }).join('\n');
  }
  return fontFaceCssCache;
}

let logoBase64Cache = null;
/**
 * Returns the LDC logo encoded as a base64 PNG data URI, for use in the
 * Puppeteer header template (which only supports inline/data image sources).
 */
function getLogoDataUri() {
  if (!logoBase64Cache) {
    const logoPath = path.join(__dirname, '..', 'assets', 'ldc-logo.png');
    logoBase64Cache = `data:image/png;base64,${fs.readFileSync(logoPath).toString('base64')}`;
  }
  return logoBase64Cache;
}

/**
 * Wraps the rendered markdown body HTML into a full HTML document, with
 * GitHub's markdown CSS, custom print styles and (optionally) an inlined
 * copy of mermaid.js that renders any `.mermaid` blocks client-side.
 */
function buildHtmlDocument({ title, bodyHtml, includeMermaid }) {
  const mermaidScript = includeMermaid
    ? `<script>${getMermaidJs()}</script>
<script>
  window.__mermaidDone = false;
  document.addEventListener('DOMContentLoaded', function () {
    mermaid.initialize({ startOnLoad: false, securityLevel: 'loose' });
    mermaid.run({ querySelector: '.mermaid' })
      .catch(function (err) { console.error('mermaid render error', err); })
      .finally(function () { window.__mermaidDone = true; });
  });
</script>`
    : '<script>window.__mermaidDone = true;</script>';

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>${escapeHtml(title)}</title>
<style>
${githubCss}
</style>
<style>
${getFontFaceCss()}
</style>
<style>
${pdfCss}
</style>
</head>
<body>
<article class="markdown-body">
${bodyHtml}
</article>
${mermaidScript}
</body>
</html>`;
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * Builds the Puppeteer `headerTemplate` HTML shown on every page: the LDC
 * logo pinned to the top-left and, optionally, a centered document title.
 * Header/footer templates are isolated documents, so styles must be inline.
 */
function buildHeaderTemplate({ title }) {
  const titleHtml = title
    ? `<div style="position:absolute; left:0; right:0; top:0; text-align:center; font-family:Arial,sans-serif; font-size:11px; font-weight:bold; color:#032D42;">${escapeHtml(title)}</div>`
    : '';

  return `<div style="position:relative; width:100%; padding:0 16px; box-sizing:border-box; -webkit-print-color-adjust:exact;">
  <img src="${getLogoDataUri()}" style="position:absolute; left:16px; top:0; height:22px;" />
  ${titleHtml}
</div>`;
}

module.exports = { buildHtmlDocument, buildHeaderTemplate };
