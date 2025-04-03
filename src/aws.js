import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';

const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  }
});

export const awsGet = async (input) => {
  const command = new GetObjectCommand(input);

  try {
    const response = await s3Client.send(command);
    const chunks = [];

    return new Promise((resolve, reject) => {
      response.Body.on('data', (chunk) => chunks.push(chunk));
      response.Body.on('end', () => resolve(Buffer.concat(chunks)));
      response.Body.on('error', reject);
    });
  } catch (error) {
    throw new Error(
      `Get from S3 failed: ${error.message}. Bucket: ${input.Bucket}. Key: ${input.Key}`
    );
  }
};

export const awsPut = async (input) => {
  const command = new PutObjectCommand(input);

  try {
    await s3Client.send(command);
    return `s3://${input.Bucket}/${input.Key}`;
  } catch (error) {
    throw new Error(
      `Put to S3 failed: ${error.message}. Bucket: ${input.Bucket}. Key: ${input.Key}`
    );
  }
};
