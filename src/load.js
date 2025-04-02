import fs from 'fs';
import http from 'http';
import https from 'https';
import path from 'path';
import { UnauthorizedFileAccessError } from './errors.js';

export const loadImage = async (originalPath, options) => {
  const isRemote = originalPath.startsWith('/http:') || originalPath.startsWith('/https:');
  let imageData;

  if (isRemote) {
    imageData = await httpGet(originalPath.substring(1));
  } else if (options.baseExternalUrl) {
    imageData = await httpGet(path.join(options.baseExternalUrl, originalPath));
  } else {
    const safePathname = path.normalize(path.join(options.baseDir, originalPath));

    if (!safePathname.startsWith(path.normalize(options.baseDir))) {
      throw new UnauthorizedFileAccessError(`Unauthorized file access: ${originalPath}`);
    }

    imageData = await fs.promises.readFile(safePathname);
  }

  return imageData;
};

const httpGet = (url) => {
  const protocol = url.startsWith('https') ? https : http;

  return new Promise((resolve, reject) => {
    const req = protocol.get(url, (response) => {
      const { statusCode } = response;

      if (statusCode !== 200) {
        response.resume();
        reject(`Request Failed. Status Code: ${statusCode}. ${url}`);
        return;
      }

      const data = [];

      response.on('data', (chunk) => {
        data.push(chunk);
      });

      response.on('end', () => {
        resolve(Buffer.concat(data));
      });
    });

    req.on('error', (err) => {
      reject(err);
    });
  });
};
