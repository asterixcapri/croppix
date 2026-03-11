import { handleRequest } from './handler.js';
import { NotFoundError } from './errors.js';
import { logRequest } from './logger.js';

export async function handler(event) {
  const url = event.rawPath || event.path || '/';

  try {
    const result = await handleRequest(url);

    logRequest(200, url);
    return {
      statusCode: 200,
      headers: {
        'Content-Type': result.contentType,
        'Cache-Control': 'public, max-age=31536000, immutable'
      },
      body: result.buffer.toString('base64'),
      isBase64Encoded: true
    };
  } catch (err) {
    if (err instanceof NotFoundError) {
      logRequest(404, url, err.message);
      return {
        statusCode: 404,
        headers: { 'Content-Type': 'text/plain' },
        body: 'Not found'
      };
    }

    logRequest(500, url, err.message);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'text/plain' },
      body: 'Internal server error'
    };
  }
}
