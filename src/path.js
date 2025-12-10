import { NotFoundError } from './errors.js';

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
    throw new NotFoundError('Path is required');
  }

  const pathWithoutSlash = path.substring(1);
  const isRemote = pathWithoutSlash.startsWith('http://') || pathWithoutSlash.startsWith('https://');

  const lastSlash = pathWithoutSlash.lastIndexOf('/');
  const sourcePath = pathWithoutSlash.substring(0, lastSlash);
  const paramsPath = pathWithoutSlash.substring(lastSlash + 1);

  if (paramsPath === 'original') {
    params.original = true;

    return { sourcePath, isRemote, params };
  }

  const paramsParts = paramsPath.split('.');
  const format = paramsParts.pop().toLowerCase();

  if (!allowed.formats.includes(format)) {
    throw new NotFoundError(`Image format not allowed: ${format}`);
  }

  params.format = format === 'jpg' ? 'jpeg' : format;

  const pathParams = paramsParts.join('.').split('_');

  for (const pathParam of pathParams) {
    if (pathParam.length < 2) {
      continue;
    }

    const pathParamType = pathParam.charAt(0);
    const pathParamValue = pathParam.substring(1);

    switch (pathParamType) {
      case 'w': { // width
        const width = parseInt(pathParamValue, 10);
        if (Number.isNaN(width) || width <= 0 || width > allowed.maxDimension) {
          throw new NotFoundError(`Width out of range: ${pathParamValue}`);
        }
        params.width = width;
        break;
      }

      case 'h': { // height
        const height = parseInt(pathParamValue, 10);
        if (Number.isNaN(height) || height <= 0 || height > allowed.maxDimension) {
          throw new NotFoundError(`Height out of range: ${pathParamValue}`);
        }
        params.height = height;
        break;
      }

      case 's': { // shortSide
        const shortSide = parseInt(pathParamValue, 10);
        if (Number.isNaN(shortSide) || shortSide <= 0 || shortSide > allowed.maxDimension) {
          throw new NotFoundError(`shortSide out of range: ${pathParamValue}`);
        }
        params.shortSide = shortSide;
        break;
      }

      case 'l': { // longSide
        const longSide = parseInt(pathParamValue, 10);
        if (Number.isNaN(longSide) || longSide <= 0 || longSide > allowed.maxDimension) {
          throw new NotFoundError(`longSide out of range: ${pathParamValue}`);
        }
        params.longSide = longSide;
        break;
      }

      case 'c': { // crop
        if (!allowed.crops.includes(pathParamValue)) {
          throw new NotFoundError(`Crop not allowed: ${pathParamValue}`);
        }
        params.crop = pathParamValue;
        break;
      }

      case 'q': { // quality
        if (!allowed.qualities.includes(pathParamValue)) {
          throw new NotFoundError(`Quality not allowed: ${pathParamValue}`);
        }
        params.quality = pathParamValue;
        break;
      }

      case 'd': { // density
        const density = parseFloat(pathParamValue);
        if (Number.isNaN(density) || density < 1.0 || density > allowed.maxDensity) {
          throw new NotFoundError(`Density out of range: ${pathParamValue}`);
        }
        params.density = density;
        break;
      }
    }
  }

  return { sourcePath, isRemote, params };
};
