import { spawn } from 'node:child_process';

const isWin = process.platform === 'win32';

const server = spawn(isWin ? 'npm.cmd' : 'npm', ['run', 'dev:server'], {
  stdio: 'inherit',
  shell: isWin
});

const client = spawn(isWin ? 'npm.cmd' : 'npm', ['run', 'dev:client'], {
  stdio: 'inherit',
  shell: isWin
});

const procs = [server, client];

const shutdown = () => {
  for (const p of procs) {
    if (!p.killed) {
      try {
        p.kill('SIGTERM');
      } catch {
        // no-op
      }
    }
  }
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

for (const p of procs) {
  p.on('error', (err) => {
    console.error('Failed to start child process:', err.message);
    shutdown();
    process.exit(1);
  });

  p.on('exit', (code) => {
    if (typeof code === 'number' && code !== 0) {
      shutdown();
      process.exit(code);
    }
  });
}
