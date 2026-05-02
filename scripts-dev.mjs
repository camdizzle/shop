import { spawn } from 'node:child_process';

const procs = [
  spawn(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['run', 'dev:server'], { stdio: 'inherit' }),
  spawn(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['run', 'dev:client'], { stdio: 'inherit' })
];

const shutdown = () => {
  for (const p of procs) {
    if (!p.killed) p.kill();
  }
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

for (const p of procs) {
  p.on('exit', (code) => {
    if (code && code !== 0) {
      shutdown();
      process.exit(code);
    }
  });
}
