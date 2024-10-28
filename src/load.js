import fs from 'fs';
import http from 'http';
import https from 'https';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';

export const loadImage = async (path, options) => {
  const isRemote = path.startsWith('/http:') || path.startsWith('/https:');

  if (isRemote) {
    const remoteImageUrl = path.substring(1);
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
  } else if (options.s3 && options.s3.accessKeyId && options.s3.secretAccessKey && options.s3.bucketName) {
    const s3Client = new S3Client({
      region: options.s3.region,
      credentials: {
        accessKeyId: options.s3.accessKeyId,
        secretAccessKey: options.s3.secretAccessKey,
      },
    });

    const params = {
      Bucket: options.s3.bucketName,
      Key: path.startsWith('/') ? path.substring(1) : path
    };

    try {
      const command = new GetObjectCommand(params);
      const data = await s3Client.send(command);

      const streamToBuffer = async (stream) => {
        return new Promise((resolve, reject) => {
          const chunks = [];
          stream.on('data', (chunk) => chunks.push(chunk));
          stream.on('end', () => resolve(Buffer.concat(chunks)));
          stream.on('error', (err) => reject(err));
        });
      };

      return await streamToBuffer(data.Body);
    } catch (err) {
      throw err;
    }
  } else {
    return fs.promises.readFile(options.baseDir + path);
  }
};
