import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { RekognitionClient, DetectLabelsCommand } from '@aws-sdk/client-rekognition';
import sharp from 'sharp';

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
    throw new Error(
      `Get from S3 failed: ${error.message}. Bucket: ${input.Bucket}. Key: ${input.Key}`
    );
  }
};

export const awsPut = async (input) => {
  input.Key = decodeURIComponent(input?.Key);
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

export const awsDetectSubject = async (imageBuffer, metadata) => {
  if (metadata.format !== 'jpeg') {
    imageBuffer = await sharp(imageBuffer).jpeg().toBuffer();
  }

  const command = new DetectLabelsCommand({
    Image: { Bytes: imageBuffer },
    MinConfidence: 70
  });

  try {
    const response = await rekognitionClient.send(command);

    // Find objects with bounding boxes, sorted by confidence
    const withBox = response.Labels
      .filter(label => label.Instances?.length > 0)
      .sort((a, b) => b.Confidence - a.Confidence);

    if (withBox.length === 0) {
      return null;
    }

    // Get the bounding box of the most confident object and convert to pixel coordinates
    const box = withBox[0].Instances[0].BoundingBox;

    return {
      x: Math.round(box.Left * metadata.width),
      y: Math.round(box.Top * metadata.height),
      width: Math.round(box.Width * metadata.width),
      height: Math.round(box.Height * metadata.height)
    };
  } catch (error) {
    console.error('Rekognition awsDetectSubject failed:', error.message);
    return null;
  }
};
