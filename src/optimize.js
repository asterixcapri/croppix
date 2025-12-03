export const optimize = async (image, params) => {
  image.sharpen({ sigma: 0.5 });

  if (params.format === 'webp') {
    optimizeWebp(image, params);
  } else {
    optimizeJpeg(image, params);
  }

  return await image.toBuffer();
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
