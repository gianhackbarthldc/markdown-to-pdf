'use strict';

const path = require('path');
const fs = require('fs-extra');
const { Command } = require('commander');
const { glob } = require('glob');
const puppeteer = require('puppeteer');

const { convertFile } = require('./convert');
const packageJson = require('../package.json');

/**
 * Expands the raw CLI arguments (files, glob patterns and/or directories)
 * into a de-duplicated, sorted list of absolute .md file paths.
 */
async function expandInputs(inputs) {
  const resolved = new Set();

  for (const input of inputs) {
    const absolute = path.resolve(input);

    if (await fs.pathExists(absolute)) {
      const stat = await fs.stat(absolute);
      if (stat.isDirectory()) {
        const found = await glob('**/*.md', { cwd: absolute, nodir: true, absolute: true });
        found.forEach((f) => resolved.add(path.resolve(f)));
        continue;
      }
      if (stat.isFile()) {
        resolved.add(absolute);
        continue;
      }
    }

    // Not an existing path as-is: treat it as a glob pattern.
    const matches = await glob(input, { nodir: true, absolute: true });
    matches.forEach((f) => resolved.add(path.resolve(f)));
  }

  return Array.from(resolved)
    .filter((f) => f.toLowerCase().endsWith('.md'))
    .sort();
}

async function run(argv) {
  const program = new Command();

  program
    .name('mk-pdf')
    .version(packageJson.version)
    .description('Converte arquivos Markdown em PDFs estilizados no padrão GitHub')
    .argument('<inputs...>', 'arquivo(s) .md, padrão glob (ex: *.md) ou pasta(s) a converter')
    .option('-o, --output <pasta>', 'pasta de destino para os PDFs gerados (padrão: mesma pasta do .md)')
    .option('-t, --title <titulo>', 'título exibido centralizado no topo de cada página do PDF')
    .option('--no-toc', 'não gerar sumário/índice automático')
    .option('--no-mermaid', 'não renderizar diagramas Mermaid')
    .action(async (inputs, options) => {
      const files = await expandInputs(inputs);

      if (files.length === 0) {
        console.error('Nenhum arquivo .md encontrado para os argumentos informados.');
        process.exitCode = 1;
        return;
      }

      console.log(`Encontrado(s) ${files.length} arquivo(s) markdown. Convertendo...`);

      const browser = await puppeteer.launch({ headless: true });
      const results = [];

      try {
        for (const file of files) {
          try {
            const outputPath = await convertFile(file, {
              browser,
              outputDir: options.output,
              toc: options.toc,
              mermaid: options.mermaid,
              title: options.title,
            });
            console.log(`  OK   ${file} -> ${outputPath}`);
            results.push({ file, ok: true });
          } catch (err) {
            console.error(`  FALHOU ${file}: ${err.message}`);
            results.push({ file, ok: false, error: err });
          }
        }
      } finally {
        await browser.close();
      }

      const failures = results.filter((r) => !r.ok);
      console.log(`\nConcluído: ${results.length - failures.length}/${results.length} arquivo(s) convertido(s) com sucesso.`);
      if (failures.length > 0) {
        console.log('Falhas:');
        failures.forEach((f) => console.log(`  - ${f.file}: ${f.error.message}`));
        process.exitCode = 1;
      }
    });

  await program.parseAsync(argv);
}

module.exports = { run, expandInputs };
