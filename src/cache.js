import FilesystemCache from 'node-filesystem-cache';

export const cachedResult = async (imageUrl, options, callback) => {
  const cache = new FilesystemCache(options.cacheDir);
  let result = cache.get(imageUrl);

  if (result === null) {
    result = await callback();
    cache.put(imageUrl, result);
  }

  return result;
};
