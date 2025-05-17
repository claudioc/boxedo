#!/usr/bin/env node
import { bootstrap } from './lib/bootstrap';

process.title = 'boxedo';

const argv = process.argv.slice(2);

if (argv.length === 0) {
  console.error('No command specified. Run `boxedo help` for usage');
  process.exit(1);
}

bootstrap.run();
