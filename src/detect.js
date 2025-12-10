import sharp from 'sharp';
import { awsDetectFaces } from './aws.js';
import { log } from './logger.js';

const FACE_PROMINENCE_THRESHOLD = 0.5; // percentage of image area
const GROUP_PHOTO_MIN_FACES = 2;     // minimum faces to consider it a group photo

export const detectSubject = async (imageBuffer, metadata) => {
  // Face detection temporarily disabled - always use sharp attention
  // TODO: re-enable and test face detection
  return null;

  if (metadata.format !== 'jpeg') {
    imageBuffer = await sharp(imageBuffer).jpeg().toBuffer();
  }
  const faceBox = await detectFaces(imageBuffer, metadata);
  return faceBox;
};

const detectFaces = async (imageBuffer, metadata) => {
  try {
    const response = await awsDetectFaces(imageBuffer);

    if (!response.FaceDetails || response.FaceDetails.length === 0) {
      log('Detection: no faces → sharp attention');
      return null;
    }

    const imageArea = metadata.width * metadata.height;
    const faceCount = response.FaceDetails.length;

    // Calculate individual face sizes
    const faces = response.FaceDetails.map(f => {
      const box = f.BoundingBox;
      const area = (box.Width * metadata.width) * (box.Height * metadata.height);
      const percentage = (area / imageArea) * 100;
      return { box, area, percentage };
    });

    const largestFace = Math.max(...faces.map(f => f.percentage));

    // Case 1: At least one prominent face - use faces
    if (largestFace >= FACE_PROMINENCE_THRESHOLD) {
      if (faceCount === 1) {
        log(`Detection: portrait (${largestFace.toFixed(1)}%)`);
        return createFaceBox(faces[0].box, metadata);
      }
      log(`Detection: faces with prominent (${faceCount} faces, largest ${largestFace.toFixed(1)}%)`);
      return createCombinedFaceBox(response.FaceDetails, metadata);
    }

    // Case 2: Many small faces (group photo)
    if (faceCount >= GROUP_PHOTO_MIN_FACES) {
      log(`Detection: group photo (${faceCount} faces, largest ${largestFace.toFixed(1)}%)`);
      return createCombinedFaceBox(response.FaceDetails, metadata);
    }

    // Case 3: Few small faces - probably background people
    log(`Detection: small faces (${faceCount} faces, ${largestFace.toFixed(1)}%) → sharp attention`);
    return null;

  } catch (error) {
    const errorMsg = error.message || error.Code || error.name || 'Unknown error';
    log(`Detection: error (${errorMsg}) → sharp attention`);
    return null;
  }
};

const createFaceBox = (box, metadata) => {
  const faceBox = {
    x: box.Left * metadata.width,
    y: box.Top * metadata.height,
    width: box.Width * metadata.width,
    height: box.Height * metadata.height
  };

  return addPadding(faceBox, metadata);
};

const createCombinedFaceBox = (faceDetails, metadata) => {
  let minX = 1, minY = 1, maxX = 0, maxY = 0;

  for (const face of faceDetails) {
    const box = face.BoundingBox;
    minX = Math.min(minX, box.Left);
    minY = Math.min(minY, box.Top);
    maxX = Math.max(maxX, box.Left + box.Width);
    maxY = Math.max(maxY, box.Top + box.Height);
  }

  const faceBox = {
    x: minX * metadata.width,
    y: minY * metadata.height,
    width: (maxX - minX) * metadata.width,
    height: (maxY - minY) * metadata.height
  };

  return addPadding(faceBox, metadata);
};

const addPadding = (faceBox, metadata) => {
  const paddingTop = faceBox.height * 0.5;
  const paddingBottom = faceBox.height * 0.2;
  const paddingHorizontal = faceBox.width * 0.3;

  return {
    x: Math.max(0, Math.round(faceBox.x - paddingHorizontal)),
    y: Math.max(0, Math.round(faceBox.y - paddingTop)),
    width: Math.min(
      metadata.width - Math.max(0, Math.round(faceBox.x - paddingHorizontal)),
      Math.round(faceBox.width + paddingHorizontal * 2)
    ),
    height: Math.min(
      metadata.height - Math.max(0, Math.round(faceBox.y - paddingTop)),
      Math.round(faceBox.height + paddingTop + paddingBottom)
    )
  };
};
