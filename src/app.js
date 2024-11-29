import http from 'http';
import process from 'process';
import { getCachedResult } from './cache.js';
import { loadImage } from './load.js';
import { processImage } from './process.js';
import { UnsupportedFileExtensionError, UnauthorizedFileAccessError } from './errors.js';

const options = {
  hostname: process.env.HOSTNAME || '0.0.0.0',
  port: process.env.PORT || 3003,
  baseDir: process.env.BASE_DIR || './images',
  baseExternalUrl: process.env.BASE_EXTERNAL_URL || '',
  cacheDir: process.env.CACHE_DIR || './cache'
};

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${options.hostname}`);

    const result = await getCachedResult(req.url, options, async () => {
      const imageData = await loadImage(url.pathname, options);
      return await processImage(imageData, url.searchParams);
    });

    if (!result) {
      throw new Error('No result');
    }

    res.statusCode = 200;
    res.setHeader('Content-Type', 'image/' + result.imageOptions.format);
    res.end(Buffer.from(result.imageData));
  } catch (err) {
    console.error(req);
    console.error(err);

    if (err instanceof UnsupportedFileExtensionError) {
      res.statusCode = 400;
      res.setHeader('Content-Type', 'text/plain');
      res.end('Unsupported file extension');
    } else if (err instanceof UnauthorizedFileAccessError) {
      res.statusCode = 403;
      res.setHeader('Content-Type', 'text/plain');
      res.end('Access denied');
    } else {
      res.statusCode = 404;
      res.setHeader('Content-Type', 'text/plain');
      res.end('Not found');
    }
  }
});

server.listen(options.port, options.hostname, () => {
  console.warn(`Server running at http://${options.hostname}:${options.port}/`);
});
