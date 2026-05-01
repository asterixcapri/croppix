import fs from 'fs';
import http from 'http';
import path from 'path';
import process from 'process';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const compareRoot = path.join(projectRoot, 'compare');

const dashboardPort = 4173;
const engines = [
  { name: 'attention', port: 3003 },
  { name: 'rekognition', port: 3004 }
];

const envFromFile = loadDotEnv(path.join(projectRoot, '.env'));
const baseEnv = {
  ...process.env,
  ...envFromFile,
  HOSTNAME: '0.0.0.0'
};

const children = engines.map((engine) => {
  const child = spawn('node', ['src/app.js'], {
    cwd: projectRoot,
    env: {
      ...baseEnv,
      PORT: String(engine.port),
      SMART_CROP_ENGINE: engine.name
    },
    stdio: ['ignore', 'pipe', 'pipe']
  });

  child.stdout.on('data', (chunk) => {
    process.stdout.write(prefixLines(chunk.toString(), `[${engine.name}] `));
  });

  child.stderr.on('data', (chunk) => {
    process.stderr.write(prefixLines(chunk.toString(), `[${engine.name}] `));
  });

  child.on('exit', (code, signal) => {
    const reason = signal ? `signal ${signal}` : `code ${code}`;
    process.stderr.write(`[${engine.name}] exited with ${reason}\n`);
  });

  return child;
});

const server = http.createServer((req, res) => {
  const requestPath = req.url === '/' ? '/index.html' : req.url;
  const safePath = path.normalize(requestPath).replace(/^(\.\.[/\\])+/, '');
  const filePath = path.join(compareRoot, safePath);

  if (!filePath.startsWith(compareRoot)) {
    res.statusCode = 403;
    res.end('Forbidden');
    return;
  }

  fs.readFile(filePath, (error, content) => {
    if (error) {
      res.statusCode = error.code === 'ENOENT' ? 404 : 500;
      res.end(error.code === 'ENOENT' ? 'Not found' : 'Internal server error');
      return;
    }

    res.setHeader('Content-Type', getContentType(filePath));
    res.end(content);
  });
});

server.listen(dashboardPort, '0.0.0.0', () => {
  process.stdout.write('\nComparison dashboard\n');
  process.stdout.write(`- Dashboard: http://localhost:${dashboardPort}\n`);

  for (const engine of engines) {
    process.stdout.write(`- ${engine.name}: http://localhost:${engine.port}\n`);
  }

  process.stdout.write('\nEdit compare/config.js to add or replace test images.\n\n');
});

const shutdown = () => {
  server.close();

  for (const child of children) {
    if (!child.killed) {
      child.kill('SIGINT');
    }
  }
};

process.on('SIGINT', () => {
  shutdown();
  process.exit(0);
});

process.on('SIGTERM', () => {
  shutdown();
  process.exit(0);
});

function loadDotEnv(filePath) {
  if (!fs.existsSync(filePath)) {
    return {};
  }

  const content = fs.readFileSync(filePath, 'utf8');
  const env = {};

  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    const separator = trimmed.indexOf('=');
    if (separator === -1) {
      continue;
    }

    const key = trimmed.slice(0, separator).trim();
    const value = trimmed.slice(separator + 1).trim();
    env[key] = value;
  }

  return env;
}

function prefixLines(text, prefix) {
  return text
    .split('\n')
    .filter((line, index, lines) => line.length > 0 || index < lines.length - 1)
    .map((line) => `${prefix}${line}\n`)
    .join('');
}

function getContentType(filePath) {
  if (filePath.endsWith('.html')) return 'text/html; charset=utf-8';
  if (filePath.endsWith('.css')) return 'text/css; charset=utf-8';
  if (filePath.endsWith('.js')) return 'application/javascript; charset=utf-8';
  if (filePath.endsWith('.json')) return 'application/json; charset=utf-8';
  return 'application/octet-stream';
}
