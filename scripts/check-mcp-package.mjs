/** Real npm lifecycle check in a disposable copy; no publish or business calls. */
import assert from 'node:assert/strict';
import { cpSync, mkdirSync, mkdtempSync, readdirSync, rmSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const source = fileURLToPath(new URL('../', import.meta.url));
const root = mkdtempSync(join(tmpdir(), 'octo-mcp-package-'));
const endpoint = 'https://package-fixture.example/mcp';
try {
  for (const path of ['package.json', 'tsconfig.json', 'index.ts', 'setup-entry.ts',
    'openclaw.plugin.json', 'src', 'scripts', 'skills', 'docs', 'README.md', 'CHANGELOG.md', 'LICENSE']) {
    cpSync(join(source, path), join(root, path), { recursive: true });
  }
  symlinkSync(join(source, 'node_modules'), join(root, 'node_modules'), 'dir');
  const configured = { ...process.env, OCTO_MCP_URL: endpoint };
  const unconfigured = { ...process.env };
  delete unconfigured.OCTO_MCP_URL;
  const run = (args, env) => execFileSync('npm', args, {
    cwd: root, env, encoding: 'utf8', timeout: 180_000, stdio: ['ignore', 'pipe', 'pipe'],
  });
  run(['run', 'build'], configured);
  for (const [name, env, expected] of [['configured', configured, endpoint], ['unconfigured', unconfigured, undefined]]) {
    const destination = join(root, name);
    mkdirSync(destination);
    run(['pack', '--json', '--pack-destination', destination], env);
    const files = readdirSync(destination).filter(file => file.endsWith('.tgz'));
    assert.equal(files.length, 1);
    const tarball = join(destination, files[0]);
    const read = path => execFileSync('tar', ['-xOf', tarball, 'package/' + path], { encoding: 'utf8' });
    const manifest = JSON.parse(read('openclaw.plugin.json'));
    assert.equal(manifest.mcpServers?.['octo-mcp']?.url, expected);
    const compiled = read('dist/src/mcp-deployment.js');
    assert.ok(compiled.includes(expected ? JSON.stringify(expected) : '= undefined;'));
  }
  console.log('Real build/pack lifecycles preserve the exported endpoint and clear it when unset; tarballs verified.');
} finally { rmSync(root, { recursive: true, force: true }); }
