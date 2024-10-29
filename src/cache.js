import FilesystemCache from 'node-filesystem-cache';

export const getCachedResult = async (imageUrl, options, callback) => {
  try {
    const cache = new FilesystemCache(options.cacheDir);
    let result = cache.get(imageUrl);

    if (result === null) {
      result = await callback();
      cache.put(imageUrl, result);
    }

    return result;
  } catch (error) {
    console.error('FilesystemCache error:', error);
  }
};
