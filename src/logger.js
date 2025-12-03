export const logRequest = (status, url, message = '') => {
  if (url === '/favicon.ico') {
    return;
  }

  const timestamp = new Date().toISOString();
  console.log(`${timestamp} ${status} ${url} ${message}`);
};

export const log = (message) => {
  const timestamp = new Date().toISOString();
  console.log(`${timestamp} ${message}`);
};
