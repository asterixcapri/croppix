import fs from 'fs';
import http from 'http';
import https from 'https';

export const loadImage = async (path, options) => {
  const isRemote = path.startsWith('/http:') || path.startsWith('/https:');

  if (isRemote) {
    const remoteImageUrl = path.substr(1);
    const protocol = remoteImageUrl.startsWith('https') ? https : http;

    return new Promise((resolve, reject) => {
      protocol.get(remoteImageUrl, (response) => {
        const data = [];

        response.on('data', (chunk) => {
          data.push(chunk);
        });

        response.on('end', () => {
          resolve(Buffer.concat(data));
        });

        response.on('error', (err) => {
          reject(err);
        });
      }).on('error', (err) => {
        reject(err);
      });
    });
  } else {
    return fs.promises.readFile(options.baseDir + path);
  }
};
