'use strict';

const path = require('path');

/**
 * Resolves an image src referenced inside a markdown file to something a
 * headless browser can load (http(s)/data URIs pass through untouched,
 * local relative/absolute paths become file:// URIs anchored to the
 * markdown file's directory).
 */
function resolveImageSrc(src, baseDir) {
  if (!src) return src;
  if (/^(https?:)?\/\//i.test(src) || src.startsWith('data:') || src.startsWith('file://')) {
    return src;
  }

  const absolutePath = path.isAbsolute(src) ? src : path.resolve(baseDir, src);
  const normalized = absolutePath.replace(/\\/g, '/');
  const withLeadingSlash = normalized.startsWith('/') ? normalized : `/${normalized}`;
  return `file://${withLeadingSlash}`;
}

/**
 * Overrides markdown-it's image render rule so local images resolve
 * relative to the markdown file being converted, instead of the CWD.
 */
function registerImageResolver(md, baseDir) {
  const defaultRender = md.renderer.rules.image || function (tokens, idx, options, env, self) {
    return self.renderToken(tokens, idx, options);
  };

  md.renderer.rules.image = function (tokens, idx, options, env, self) {
    const token = tokens[idx];
    const srcIndex = token.attrIndex('src');
    if (srcIndex >= 0) {
      const original = token.attrs[srcIndex][1];
      token.attrs[srcIndex][1] = resolveImageSrc(original, baseDir);
    }
    return defaultRender(tokens, idx, options, env, self);
  };
}

module.exports = { resolveImageSrc, registerImageResolver };
