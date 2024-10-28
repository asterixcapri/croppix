import http from 'http';
import process from 'process';
import { loadImage } from './load.js';
import { processImage } from './process.js';

const options = {
  hostname: process.env.HOSTNAME || '0.0.0.0',
  port: process.env.PORT || 3003,
  baseDir: process.env.BASE_DIR || './images',
  cacheDir: process.env.CACHE_DIR || './cache',
  s3: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION,
    bucketName: process.env.S3_BUCKET_NAME
  }
};

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${options.hostname}`);
    const imageData = await loadImage(url.pathname, options);
    const result = await processImage(imageData, url.searchParams);
    res.statusCode = 200;
    res.setHeader('Content-Type', 'image/' + result.imageOptions.format);
    res.end(Buffer.from(result.imageData));
  } catch (err) {
    console.error(err);
    res.statusCode = 404;
    res.setHeader('Content-Type', 'text/plain');
    res.end('Not found');
  }
});

server.listen(options.port, options.hostname, () => {
  console.warn(`Server running at http://${options.hostname}:${options.port}/`);
});
