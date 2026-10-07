'use strict';

const fs = require('fs-extra');
const path = require('path');
const MarkdownIt = require('markdown-it');
const anchor = require('markdown-it-anchor');
const toc = require('markdown-it-toc-done-right');
const hljs = require('highlight.js');

const { registerImageResolver } = require('./resolveAssets');
const { buildHtmlDocument, buildHeaderTemplate } = require('./template');

function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function highlightCode(str, lang) {
  if (lang === 'mermaid') {
    return `<div class="mermaid">${escapeHtml(str)}</div>`;
  }
  if (lang && hljs.getLanguage(lang)) {
    try {
      return `<pre class="hljs"><code>${hljs.highlight(str, { language: lang }).value}</code></pre>`;
    } catch (err) {
      // falls through to the plain, escaped render below
    }
  }
  return `<pre class="hljs"><code>${escapeHtml(str)}</code></pre>`;
}

function renderMarkdownToHtml(mdSource, { baseDir, enableToc }) {
  const md = new MarkdownIt({ html: true, linkify: true, highlight: highlightCode });

  md.use(anchor);
  if (enableToc) {
    md.use(toc, { listType: 'ul', placeholder: '\\[\\[toc\\]\\]' });
  }

  registerImageResolver(md, baseDir);

  let source = mdSource;
  if (enableToc && !/\[\[toc\]\]/i.test(source)) {
    source = `[[toc]]\n\n${source}`;
  }

  return md.render(source);
}

/**
 * Converts a single markdown file into a GitHub-styled PDF using a shared
 * (already-launched) Puppeteer browser instance.
 *
 * @returns {Promise<string>} the absolute path of the generated PDF
 */
async function convertFile(mdPath, {
  browser,
  outputDir,
  toc: enableToc = true,
  mermaid: enableMermaid = true,
  title: documentTitle,
}) {
  const absoluteMdPath = path.resolve(mdPath);
  const mdSource = await fs.readFile(absoluteMdPath, 'utf8');
  const baseDir = path.dirname(absoluteMdPath);
  const fileTitle = path.basename(absoluteMdPath, path.extname(absoluteMdPath));

  const containsMermaid = /```mermaid/i.test(mdSource);
  const bodyHtml = renderMarkdownToHtml(mdSource, { baseDir, enableToc });
  const html = buildHtmlDocument({
    title: documentTitle || fileTitle,
    bodyHtml,
    includeMermaid: enableMermaid && containsMermaid,
  });

  const targetDir = outputDir ? path.resolve(outputDir) : baseDir;
  await fs.ensureDir(targetDir);
  const outputPath = path.join(targetDir, `${fileTitle}.pdf`);

  const page = await browser.newPage();
  try {
    await page.setContent(html, { waitUntil: 'networkidle0' });
    await page.waitForFunction('window.__mermaidDone === true', { timeout: 15000 });

    await page.pdf({
      path: outputPath,
      format: 'A4',
      printBackground: true,
      displayHeaderFooter: true,
      headerTemplate: buildHeaderTemplate({ title: documentTitle }),
      footerTemplate: `
        <div style="width:100%; font-size:9px; color:#6a737d; text-align:center; padding-top:4px;">
          Página <span class="pageNumber"></span> de <span class="totalPages"></span>
        </div>`,
      margin: { top: '26mm', bottom: '22mm', left: '16mm', right: '16mm' },
    });
  } finally {
    await page.close();
  }

  return outputPath;
}

module.exports = { convertFile };
