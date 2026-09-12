import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const required = [
  'package/dist/index.js',
  'package/assets/plugin-icon.png',
  'package/config.schema.json',
  'package/README.md',
  'package/CHANGELOG.md',
  'package/LICENSE',
];

const forbidden = [
  /^package\/\.env(?:$|\.)/,
  /^package\/SPECIFICATION\.md$/,
  /^package\/coverage\//,
  /^package\/\.openai\//,
  /\/Users\//,
];

const dir = await mkdtemp(join(tmpdir(), 'homebridge-sofabaton-x1s-pack-'));

try {
  run('npm', ['pack', '--pack-destination', dir]);
  const archive = run('sh', ['-c', `ls "${dir}"/*.tgz`]).trim();
  const listing = run('tar', ['-tzf', archive]).split('\n').filter(Boolean);
  const files = new Set(listing);

  for (const file of required) {
    if (!files.has(file)) {
      throw new Error(`Package archive is missing ${file}`);
    }
  }

  for (const file of listing) {
    if (forbidden.some((pattern) => pattern.test(file))) {
      throw new Error(`Package archive contains forbidden file ${file}`);
    }
  }

  console.log('Package archive verification passed.');
} finally {
  await rm(dir, { recursive: true, force: true });
}

function run(command, args) {
  const result = spawnSync(command, args, { encoding: 'utf8' });
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(' ')} failed\n${result.stderr || result.stdout}`);
  }
  return result.stdout;
}
