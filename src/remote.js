import { NotFoundError } from './errors.js';

export const fetchRemote = async (url) => {
  try {
    const response = await fetch(url);

    if (!response.ok) {
      throw new NotFoundError(`Remote image not found: ${url}`);
    }

    return Buffer.from(await response.arrayBuffer());
  } catch (error) {
    if (error instanceof NotFoundError) {
      throw error;
    }
    throw new NotFoundError(`Failed to fetch remote image: ${error.message}`);
  }
};
