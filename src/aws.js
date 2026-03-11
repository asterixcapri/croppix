import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { RekognitionClient, DetectLabelsCommand, DetectFacesCommand } from '@aws-sdk/client-rekognition';
import { NotFoundError } from './errors.js';

const awsCredentials = {
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  }
};

const s3Client = new S3Client(awsCredentials);
const rekognitionClient = new RekognitionClient(awsCredentials);

export const awsGet = async (input) => {
  input.Key = decodeURIComponent(input?.Key);
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
    throw new NotFoundError(error.message);
  }
};

export const awsPut = async (input) => {
  input.Key = decodeURIComponent(input?.Key);
  const command = new PutObjectCommand(input);

  try {
    await s3Client.send(command);
    return `s3://${input.Bucket}/${input.Key}`;
  } catch (error) {
    throw new Error(error.message);
  }
};

export const awsDetectFaces = async (imageBuffer) => {
  const command = new DetectFacesCommand({
    Image: { Bytes: imageBuffer },
    Attributes: ['DEFAULT']
  });

  return await rekognitionClient.send(command);
};

export const awsDetectLabels = async (imageBuffer) => {
  const command = new DetectLabelsCommand({
    Image: { Bytes: imageBuffer },
    MinConfidence: 70
  });

  return await rekognitionClient.send(command);
};
