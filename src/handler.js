import { parsePath } from './path.js';
import { processImage } from './process.js';
import { awsGet, awsPut } from './aws.js';
import { fetchRemote } from './remote.js';
import { NotFoundError } from './errors.js';

/**
 * Extracts the source bucket from the URL when AWS_BUCKET is not set.
 * URL format: /<bucket>/<source-path>/<params>.<format>
 * Returns { bucket, imagePath } where imagePath is everything after the bucket.
 */
function extractBucket(url) {
  const bucket = process.env.AWS_BUCKET;
  if (bucket) {
    return { bucket, imagePath: url };
  }

  // First segment is the bucket name
  const withoutSlash = url.substring(1);
  const slashIndex = withoutSlash.indexOf('/');
  if (slashIndex === -1) {
    throw new NotFoundError('Missing bucket in path');
  }

  return {
    bucket: withoutSlash.substring(0, slashIndex),
    imagePath: '/' + withoutSlash.substring(slashIndex + 1)
  };
}

/**
 * Core request handler shared by HTTP server and Lambda.
 * @param {string} url - The request URL path
 * @returns {Promise<{ buffer: Buffer, contentType: string }>}
 */
export async function handleRequest(url) {
  const { bucket, imagePath } = extractBucket(url);
  const { sourcePath, isRemote, params } = parsePath(imagePath);

  const imageBuffer = isRemote
    ? await fetchRemote(sourcePath)
    : await awsGet({
        Bucket: bucket,
        Key: sourcePath
      });

  const processedImage = await processImage(imageBuffer, params);

  if (!processedImage) {
    throw new Error('No image data');
  }

  const contentType = 'image/' + params.format;
  const buffer = Buffer.from(processedImage);

  await awsPut({
    Bucket: process.env.AWS_BUCKET_CACHE,
    Key: url.substring(1).replace('://', '/'),
    Body: processedImage,
    ContentType: contentType
  });

  return { buffer, contentType };
}
