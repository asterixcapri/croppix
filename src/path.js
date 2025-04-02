import { InvalidPathError, UnsupportedFileExtensionError } from './errors.js';

export const parsePath = (path) => {
  const params = {
    width: 0,
    height: 0,
    shortSide: 0,
    longSide: 0,
    format: 'jpeg',
    crop: 'smart',
    quality: 'optimized',
    density: 1.0,
    original: false
  };

  const allowed = {
    formats: ['jpeg', 'jpg', 'webp'],
    crops: [
      'smart',
      'entropy',
      'attention',
      'center', 
      'top',
      'rightTop',
      'right',
      'rightBottom', 
      'bottom',
      'leftBottom',
      'left',
      'leftTop',
      'none'
    ],
    qualities: ['optimized', 'balanced', 'high', 'max'],
    maxDimension: 5000,
    maxDensity: 3.0
  };

  if (!path) {
    throw new InvalidPathError('Path is required');
  }

  const pathParts = path.split('/');
  const lastPart = pathParts[pathParts.length - 1];
  const originalPath = pathParts.slice(0, -1).join('/');

  if (!lastPart.includes('_')) {
    throw new InvalidPathError(`Path is invalid: ${path}`);
  }

  const format = lastPart.split('.').pop().toLowerCase();

  if (!allowed.formats.includes(format)) {
    throw new UnsupportedFileExtensionError(`Image format not allowed: ${format}`);
  }

  params.format = format === 'jpg' ? 'jpeg' : format;

  const pathParams = lastPart.split('_');

  for (const pathParam of pathParams) {
    if (pathParam.length < 2) {
      continue;
    }

    const pathParamType = pathParam.charAt(0);
    const pathParamValue = pathParam.substring(1);

    switch (pathParamType) {
      case 'w': // width
        const width = parseInt(pathParamValue, 10);
        if (width > 0 && width <= allowed.maxDimension) {
          params.width = width;
        }
        break;

      case 'h': // height
        const height = parseInt(pathParamValue, 10);
        if (height > 0 && height <= allowed.maxDimension) {
          params.height = height;
        }
        break;

      case 's': // shortSide
        const shortSide = parseInt(pathParamValue, 10);
        if (shortSide > 0 && shortSide <= allowed.maxDimension) {
          params.shortSide = shortSide;
        }
        break;

      case 'l': // longSide
        const longSide = parseInt(pathParamValue, 10);
        if (longSide > 0 && longSide <= allowed.maxDimension) {
          params.longSide = longSide;
        }
        break;

      case 'c': // crop
        if (allowed.crops.includes(pathParamValue)) {
          params.crop = pathParamValue;
        }
        break;

      case 'q': // quality
        if (allowed.qualities.includes(pathParamValue)) {
          params.quality = pathParamValue;
        }
        break;

      case 'd': // density
        const density = parseFloat(pathParamValue);
        if (density >= 1.0 && density <= allowed.maxDensity) {
          params.density = density;
        }
        break;

      case 'o': // original
        if (pathParamValue === '1' || pathParamValue.toLowerCase() === 'true') {
          params.original = true;
        }
        break;
    }
  }

  return { originalPath, params };
};

