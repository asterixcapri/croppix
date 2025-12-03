import http from 'http';
import process from 'process';
import { parsePath } from './path.js';
import { processImage } from './process.js';
import { awsGet, awsPut } from './aws.js';
import { NotFoundError } from './errors.js';
import { logRequest } from './logger.js';

const options = {
  hostname: process.env.HOSTNAME || '0.0.0.0',
  port: process.env.PORT || 3003
};

const server = http.createServer(async (req, res) => {
  try {
    const { originalPath, params, paramsPath } = parsePath(req.url);

    const imageBuffer = await awsGet({
      Bucket: process.env.AWS_BUCKET,
      Key: originalPath.substring(1)
    });

    const processedImage = await processImage(imageBuffer, params);

    if (!processedImage) {
      throw new Error('No image data');
    }

    await awsPut({
      Bucket: process.env.AWS_BUCKET_CACHE,
      Key: originalPath.substring(1) + '/' + paramsPath,
      Body: processedImage,
      ContentType: 'image/' + params.format
    });

    logRequest(200, req.url);
    res.statusCode = 200;
    res.setHeader('Content-Type', 'image/' + params.format);
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    res.end(Buffer.from(processedImage));
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
