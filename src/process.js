import sharp from 'sharp';
import { applyCropSmart, applyCropNone, applyCropOther } from './crop.js';
import { optimize } from './optimize.js';
import { ImageProcessingError } from './errors.js';

export const processImage = async (imageBuffer, params) => {
  if (params.original) {
    return imageBuffer;
  }

  const image = sharp(imageBuffer);
  const metadata = await image.metadata();

  if (!params.format) {
    params.format = metadata.format;
  }

  const dimensions = calculateDimensions(params, metadata);
  params.width = dimensions.width;
  params.height = dimensions.height;

  let result;

  if (params.crop === 'smart') {
    console.log('crop: smart');
    result = await applyCropSmart(imageBuffer, params, metadata);
  } else if (params.crop === 'none') {
    console.log('crop: none');
    result = await applyCropNone(imageBuffer, params, metadata);
  } else {
    console.log('crop: other');
    result = await applyCropOther(imageBuffer, params, metadata);
  }

  if (!result) {
    throw new ImageProcessingError('Failed to process image');
  }

  return await optimize(result, params);
};

const calculateDimensions = (params, metadata) => {
  const { width: origWidth, height: origHeight } = metadata;
  let { width, height, shortSide, longSide, density } = params;

  // Apply density if specified
  const applyDensity = (value) => value ? Math.round(value * density) : value;
  width = applyDensity(width);
  height = applyDensity(height);
  shortSide = applyDensity(shortSide);
  longSide = applyDensity(longSide);

  // Calculate final dimensions based on options
  if (shortSide > 0) {
    if (origWidth < origHeight) {
      width = shortSide;
      height = Math.round((shortSide * origHeight) / origWidth);
    } else {
      height = shortSide;
      width = Math.round((shortSide * origWidth) / origHeight);
    }
  } else if (longSide > 0) {
    if (origWidth > origHeight) {
      width = longSide;
      height = Math.round((longSide * origHeight) / origWidth);
    } else {
      height = longSide;
      width = Math.round((longSide * origWidth) / origHeight);
    }
  } else if (width === 0 && height === 0) {
    // If no dimensions are specified, use the original ones
    width = origWidth;
    height = origHeight;
  } else if (width > 0 && height === 0) {
    // If only width is specified, calculate the height keeping the proportions
    height = Math.round((width * origHeight) / origWidth);
  } else if (width === 0 && height > 0) {
    // If only height is specified, calculate the width keeping the proportions
    width = Math.round((height * origWidth) / origHeight);
  }

  return { width, height };
};
