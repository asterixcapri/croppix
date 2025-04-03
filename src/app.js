import http from 'http';
import process from 'process';
import { parsePath } from './path.js';
import { processImage } from './process.js';
import { awsGet, awsPut } from './aws.js';

const options = {
  hostname: process.env.HOSTNAME || '0.0.0.0',
  port: process.env.PORT || 3003,
  baseDir: process.env.BASE_DIR || './images',
  baseExternalUrl: process.env.BASE_EXTERNAL_URL || ''
};

const server = http.createServer(async (req, res) => {
  try {
    const { originalPath, params, paramsPath } = parsePath(req.url);

    const imageData = await awsGet({
      Bucket: process.env.AWS_BUCKET,
      Key: originalPath.substring(1)
    });

    const processedImage = await processImage(imageData, params);

    if (!processedImage) {
      throw new Error('No image data');
    }

    await awsPut({
      Bucket: process.env.AWS_BUCKET_CACHE,
      Key: originalPath.substring(1) + '/' + paramsPath,
      Body: processedImage,
      ContentType: 'image/' + params.format
    });

    res.statusCode = 200;
    res.setHeader('Content-Type', 'image/' + params.format);
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    res.end(Buffer.from(processedImage));
  } catch (err) {
    console.error(err);

    if (err instanceof Error) {
      res.statusCode = 400;
      res.setHeader('Content-Type', 'text/plain');
      res.end(err.name + ': ' + err.message);
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
