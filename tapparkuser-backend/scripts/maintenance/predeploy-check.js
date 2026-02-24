const { spawnSync } = require('child_process');
const path = require('path');

const rootDir = path.resolve(__dirname, '..', '..');

const run = (cmd, args) => spawnSync(cmd, args, {
  cwd: rootDir,
  stdio: 'inherit',
  shell: false
});

const runNpm = (args) => {
  if (process.platform === 'win32') {
    return run('cmd.exe', ['/d', '/s', '/c', 'npm', ...args]);
  }
  return run('npm', args);
};

const checks = [
  { name: 'Syntax: server-fast.js', run: () => run('node', ['--check', 'server-fast.js']) },
  { name: 'Syntax: middleware/auth.js', run: () => run('node', ['--check', 'middleware/auth.js']) },
  { name: 'Syntax: routes/capacity-management.js', run: () => run('node', ['--check', 'routes/capacity-management.js']) },
  { name: 'Smoke test', run: () => runNpm(['run', 'smoke-test']) },
  { name: 'Audit (prod deps)', run: () => runNpm(['audit', '--omit=dev', '--audit-level=high']) }
];

for (const check of checks) {
  console.log(`\n=== ${check.name} ===`);
  const result = check.run();

  if (result.error) {
    console.error(`\nPredeploy check failed at: ${check.name}`);
    console.error(`Spawn error: ${result.error.message}`);
    process.exit(1);
  }

  if (result.status !== 0) {
    console.error(`\nPredeploy check failed at: ${check.name}`);
    process.exit(result.status || 1);
  }
}

console.log('\nAll predeploy checks passed.');
