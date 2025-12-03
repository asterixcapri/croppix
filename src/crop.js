import sharp from 'sharp';
import { awsDetectSubject } from './aws.js';
import { log } from './logger.js';

export const applyCropSmart = async (imageBuffer, params, metadata) => {
  // Try to detect main subject using Amazon Rekognition
  const subjectBox = await awsDetectSubject(imageBuffer, metadata);

  if (subjectBox) {
    const cropRect = calculateCropRect(subjectBox, metadata, params);

    return sharp(imageBuffer).extract({
      left: cropRect.x,
      top: cropRect.y,
      width: cropRect.width,
      height: cropRect.height
    })
    .resize({
      width: params.width,
      height: params.height
    });
  } else {
    // Fallback to sharp's attention strategy
    log('No subject detected, using attention strategy');

    return sharp(imageBuffer).resize({
      width: params.width,
      height: params.height,
      position: sharp.strategy.attention
    });
  }
};

export const applyCropNone = async (imageBuffer, params, metadata) => {
  const { channels } = await sharp(imageBuffer).stats();

  return sharp(imageBuffer).resize({
    width: params.width,
    height: params.height,
    fit: 'contain',
    background: {
      r: Math.round(channels[0].mean),
      g: Math.round(channels[1].mean),
      b: Math.round(channels[2].mean),
      alpha: 1
    }
  });
};

export const applyCropOther = async (imageBuffer, params, metadata) => {
  return sharp(imageBuffer).resize({
    width: params.width,
    height: params.height,
    position: getPosition(params.crop)
  });
};

const getPosition = (pos) => {
  if (pos === 'entropy') {
    return sharp.strategy.entropy;
  } else if (pos === 'attention') {
    return sharp.strategy.attention;
  } else {
    return pos.split(/(?=[A-Z])/).join(' ').toLowerCase();
  }
};

// Calculate the best crop rectangle that includes the subject and matches target aspect ratio
const calculateCropRect = (subjectBox, metadata, params) => {
  const targetAspect = params.width / params.height;
  const imageWidth = metadata.width;
  const imageHeight = metadata.height;

  // Calculate subject center
  const subjectCenterX = subjectBox.x + subjectBox.width / 2;
  const subjectCenterY = subjectBox.y + subjectBox.height / 2;

  // Determine crop dimensions based on target aspect ratio
  let cropWidth, cropHeight;

  if (targetAspect > imageWidth / imageHeight) {
    // Target is wider than image - use full width
    cropWidth = imageWidth;
    cropHeight = Math.round(cropWidth / targetAspect);
  } else {
    // Target is taller than image - use full height
    cropHeight = imageHeight;
    cropWidth = Math.round(cropHeight * targetAspect);
  }

  // Ensure crop is large enough to contain the subject
  cropWidth = Math.max(cropWidth, subjectBox.width);
  cropHeight = Math.max(cropHeight, subjectBox.height);

  // Recalculate to maintain aspect ratio after ensuring subject fits
  if (cropWidth / cropHeight > targetAspect) {
    cropHeight = Math.round(cropWidth / targetAspect);
  } else {
    cropWidth = Math.round(cropHeight * targetAspect);
  }

  // Clamp to image bounds
  cropWidth = Math.min(cropWidth, imageWidth);
  cropHeight = Math.min(cropHeight, imageHeight);

  // Center crop on subject, but keep within image bounds
  let cropX = Math.round(subjectCenterX - cropWidth / 2);
  let cropY = Math.round(subjectCenterY - cropHeight / 2);

  // Clamp position to image bounds
  cropX = Math.max(0, Math.min(cropX, imageWidth - cropWidth));
  cropY = Math.max(0, Math.min(cropY, imageHeight - cropHeight));

  return {
    x: cropX,
    y: cropY,
    width: cropWidth,
    height: cropHeight
  };
};
