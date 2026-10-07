#!/usr/bin/env node
'use strict';

const { run } = require('../src/cli');

run(process.argv).catch((err) => {
  console.error('Erro inesperado:', err);
  process.exitCode = 1;
});
