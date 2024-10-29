import fs from 'fs';
import http from 'http';
import https from 'https';
import path from 'path';

export const loadImage = async (pathname, options) => {
  const isRemote = pathname.startsWith('/http:') || pathname.startsWith('/https:');

  if (isRemote) {
    return remoteGet(pathname.substring(1));
  } else if (options.baseExternalUrl) {
    return remoteGet(path.join(options.baseExternalUrl, pathname));
  } else {
    const safePathname = path.normalize(path.join(options.baseDir, pathname));

    if (!safePathname.startsWith(path.normalize(options.baseDir))) {
      throw new Error('Unauthorized access to filesystem!');
    }

    return fs.promises.readFile(safePathname);
  }
};

const remoteGet = (url) => {
  const protocol = url.startsWith('https') ? https : http;

  return new Promise((resolve, reject) => {
    const req = protocol.get(url, (response) => {
      const { statusCode } = response;

      if (statusCode !== 200) {
        response.resume();
        reject(`${url} Request Failed. Status Code: ${statusCode}`);
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
