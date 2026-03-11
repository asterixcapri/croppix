import http from 'http';
import process from 'process';
import { handleRequest } from './handler.js';
import { NotFoundError } from './errors.js';
import { logRequest } from './logger.js';

const options = {
  hostname: process.env.HOSTNAME || '0.0.0.0',
  port: process.env.PORT || 3003
};

const server = http.createServer(async (req, res) => {
  try {
    const result = await handleRequest(req.url);

    logRequest(200, req.url);
    res.statusCode = 200;
    res.setHeader('Content-Type', result.contentType);
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    res.end(result.buffer);
  } catch (err) {
    if (err instanceof NotFoundError) {
      logRequest(404, req.url, err.message);
      res.statusCode = 404;
      res.setHeader('Content-Type', 'text/plain');
      res.end('Not found');
    } else {
      logRequest(500, req.url, err.message);
      res.statusCode = 500;
      res.setHeader('Content-Type', 'text/plain');
      res.end('Internal server error');
    }
  }
});

server.listen(options.port, options.hostname, () => {
  console.warn(`Server running at http://${options.hostname}:${options.port}/`);
});
