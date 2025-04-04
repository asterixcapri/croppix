import sharp from 'sharp';
import smartcrop from 'smartcrop-sharp';
import { ImageProcessingError } from './errors.js';

export const processImage = async (imageData, params) => {
  if (params.original) {
    return imageData;
  }

  const image = sharp(imageData);
  const metadata = await image.metadata();

  if (!params.format) {
    params.format = metadata.format;
  }

  const dimensions = calculateDimensions(params, metadata);
  params.width = dimensions.width;
  params.height = dimensions.height;

  let result;

  if (params.crop === 'smart') {
    result = await applyCropSmart(imageData, params);
  } else if (params.crop === 'none') {
    result = await applyCropNone(imageData, params);
  } else {
    result = await applyCropOther(imageData, params);
  }

  if (!result) {
    throw new ImageProcessingError('Failed to process image');
  }

  return result;
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

const applyCropSmart = async (imageData, params) => {
  const size = { width: params.width, height: params.height };

  const smartcropparams = {};

  const cropResult = await smartcrop.crop(imageData, {
    width: params.width,
    height: params.height,
    ...smartcropparams
  });

  const image = sharp(imageData)
    .extract({
      width: cropResult.topCrop.width,
      height: cropResult.topCrop.height,
      left: cropResult.topCrop.x,
      top: cropResult.topCrop.y
    })
    .resize(size);

  return await finalize(image, params);
};

const applyCropNone = async (imageData, params) => {
  const image = sharp(imageData);

  // Get the average background color from the image
  const { channels } = await image.stats();

  const backgroundColor = {
    r: Math.round(channels[0].mean),
    g: Math.round(channels[1].mean),
    b: Math.round(channels[2].mean),
    alpha: 1
  };

  // Resize the image without cropping, using the average background color
  image.resize({
    width: params.width,
    height: params.height,
    fit: 'contain',
    background: backgroundColor
  });

  return await finalize(image, params);
};

const applyCropOther = async (imageData, params) => {
  const image = sharp(imageData);

  // Resize the image with crop in the specified position
  image.resize({
    width: params.width,
    height: params.height,
    position: getPosition(params.crop)
  });

  return await finalize(image, params);
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

const finalize = async (image, params) => {
  optimize(image, params);
  return await image.toBuffer();
};

const optimize = (image, params) => {
  image.sharpen({ sigma: 0.5 });

  if (params.format === 'webp') {
    optimizeWebp(image, params);
  } else {
    optimizeJpeg(image, params);
  }
};

const optimizeJpeg = (image, params) => {
  let quality = 88;

  if (params.quality === 'optimized') {
    quality = 70;
  } else if (params.quality === 'balanced') {
    quality = 80;
  }

  image.jpeg({ quality, mozjpeg: params.quality === 'optimized' });
};

const optimizeWebp = (image, params) => {
  let quality = 80;

  if (params.quality === 'optimized') {
    quality = 75;
  } else if (params.quality === 'balanced') {
    quality = 80;
  } else if (params.quality === 'high') {
    quality = 90;
  }

  image.webp({ quality });
};
