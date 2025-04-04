export class InvalidPathError extends Error {
  constructor(message) {
    super(message);
    this.name = 'InvalidPathError';
  }
}

export class UnsupportedFileExtensionError extends Error {
  constructor(message) {
    super(message);
    this.name = 'UnsupportedFileExtensionError';
  }
}

export class ImageProcessingError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ImageProcessingError';
  }
}

export class UnauthorizedFileAccessError extends Error {
  constructor(message) {
    super(message);
    this.name = 'UnauthorizedFileAccessError';
  }
}
