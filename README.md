# Croppix

[![Docker Pulls](https://img.shields.io/docker/pulls/caprionlinesrl/croppix)](https://hub.docker.com/r/caprionlinesrl/croppix)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://www.tldrlegal.com/license/mit-license)
[![GitHub stars](https://img.shields.io/github/stars/asterixcapri/croppix?style=social)](https://github.com/asterixcapri/croppix)

**Croppix** is an open-source image processing service based on [Sharp](https://sharp.pixelplumbing.com/) and [Smartcrop](https://github.com/jwagner/smartcrop.js), allowing dynamic generation of cropped and optimized images directly from URL parameters, with intelligent caching support on AWS S3.

Croppix is designed to be integrated into high-performance websites, serving optimized images directly from a CDN (like CloudFront), with automatic fallback to a processing server when cache is missed.

## 🔍 Table of Contents

- [🚀 Architecture and Production Deployment](#🚀-architecture-and-production-deployment)
- [🔧 Features and Quick Start with Docker](#🔧-features-and-quick-start-with-docker)
- [📂 URL Parameters for Image Transformations](#📂-url-parameters-for-image-transformations)
- [✂️ Supported Crop Types (`c{crop}`)](#✂️-supported-crop-types-ccrop)
- [🧑‍💻 Local Development Setup](#🧑‍💻-local-development-setup)
- [⚖️ License](#⚖️-license)

## 🚀 Architecture and Production Deployment

Croppix typically runs as a Node.js service behind an Ingress (NGINX or ALB),
with original images stored in an S3 bucket (`AWS_BUCKET`) and processed images stored in a separate bucket (`AWS_BUCKET_CACHE`).

Docker is recommended for deployment, along with CDN integration such as CloudFront.

### 🔄 How it Works in Production

1. A user requests an image from CloudFront, for example:

   ```
   https://your-cloudfront-distribution.net/photos/image123.jpg/w240_h160_csmart.webp
   ```

2. CloudFront checks the S3 cache bucket:
   - ✅ If the image exists, it serves it immediately
   - 🚫 If it doesn't exist (404 or 403), it falls back to Croppix

3. Croppix receives the request and processes the image:
   - Fetches it from the source bucket (`AWS_BUCKET`)
   - Applies the requested transformations
   - Stores the result in `AWS_BUCKET_CACHE`
   - Returns the image to CloudFront

4. CloudFront caches the image for future requests

## 🔧 Features and Quick Start with Docker

Croppix is also available as a Docker container:

👉 [https://hub.docker.com/r/caprionlinesrl/croppix](https://hub.docker.com/r/caprionlinesrl/croppix)

You can run the container with:

```bash
docker run -p 3003:3003 \
  -e AWS_ACCESS_KEY_ID=xxx \
  -e AWS_SECRET_ACCESS_KEY=xxx \
  -e AWS_REGION=us-east-1 \
  -e AWS_BUCKET=your-source-bucket \
  -e AWS_BUCKET_CACHE=your-cache-bucket \
  asterixcapri/croppix:latest
```

Croppix is designed to work behind a **CloudFront distribution** with two origins:

1. **Primary origin**: S3 bucket `AWS_BUCKET_CACHE` (with cached processed images)
2. **Secondary origin (fallback)**: `https://your-croppix-domain.com` (Croppix processor)

### 📊 Architecture Benefits

- ⚡ High performance via CloudFront + S3
- 👊 Croppix server is hit only on cache misses
- 📆 Fully cacheable and URL-customizable images
- 🚪 Robust system with automatic fallback
- ✨ On-demand image generation via URL
- 📁 Integration with AWS S3 for source and cache
- ⚡ Output in WebP, JPEG, PNG and more
- 🔄 Smart crop, resize, retina scaling, cache busting
- ⚙ Docker-ready

## 📂 URL Parameters for Image Transformations

A Croppix image request looks like this:

```
https://your-croppix-domain.com/<image-path>/<transform-params>.<format>
```

### ✅ Example

```
https://your-croppix-domain.com/photos/image123.jpg/w400_h300_d2_csmart_u1712345678.webp
```

### Supported Parameters

| Parameter        | Description |
|------------------|-------------|
| `w{width}`       | Width in pixels (e.g., `w240`) |
| `h{height}`      | Height in pixels (e.g., `h160`) |
| `s{shortSide}`   | Fit to the shortest side |
| `l{longSide}`    | Fit to the longest side |
| `c{crop}`        | Crop type (see below) |
| `q{quality}`     | Output quality (e.g., `q80`) |
| `d{density}`     | Retina scale factor, e.g., `d2` |
| `o1`             | Force original image without transformations |
| `u{updatedAt}`   | Cache busting timestamp (e.g., `u1684485984`) |
| `.webp`, `.jpeg`, `.png` | Output format |

Parameters can be combined with `_` and used in any order.

## ✂️ Supported Crop Types (`c{crop}`)

Croppix supports the following crop modes via the `c{crop}` parameter:

| Value        | Description |
|---------------|----------------------------------------------------------------------------------|
| `smart`       | Smart crop on the main subject (uses `smartcrop`)                               |
| `none`        | No crop: resize and fill with the average background color                      |
| `entropy`     | Crop area with highest entropy (Sharp)                                          |
| `attention`   | Crop area with visual attention (Sharp)                                         |
| `fit`         | Fit image within dimensions without cropping                                    |
| `center`      | Center crop                                                                     |
| `top`         | Crop from the top                                                               |
| `bottom`      | Crop from the bottom                                                            |
| `left`        | Crop from the left                                                              |
| `right`       | Crop from the right                                                             |
| `leftTop`     | Crop from top-left corner                                                       |
| `rightTop`    | Crop from top-right corner                                                      |
| `leftBottom`  | Crop from bottom-left corner                                                    |
| `rightBottom` | Crop from bottom-right corner                                                   |

## ℹ️ Optional JavaScript Example

To dynamically generate Croppix URLs in a frontend app:

```js
const croppixBaseUrl = 'https://your-croppix-domain.com';

export const croppixUrl = (path, params) => {
  if (!path) return '';
  return croppixBaseUrl + encodeURI(path) + '/' + formatParams(params);
};

const formatParams = (params = {}) => {
  const parts = [];
  if (params.width) parts.push(`w${params.width}`);
  if (params.height) parts.push(`h${params.height}`);
  if (params.shortSide) parts.push(`s${params.shortSide}`);
  if (params.longSide) parts.push(`l${params.longSide}`);
  if (params.crop) parts.push(`c${params.crop}`);
  if (params.quality) parts.push(`q${params.quality}`);
  if (params.density) parts.push(`d${params.density}`);
  if (params.original) parts.push('o1');
  if (params.updatedAt) parts.push(`u${params.updatedAt}`);

  const extension = params.format || 'jpeg';
  return parts.join('_') + '.' + extension;
};
```

## 🧑‍💻 Local Development Setup

### Requirements

- Docker installed
- Two S3 buckets:
  - `AWS_BUCKET` for original images
  - `AWS_BUCKET_CACHE` for processed images

Everything else is handled by the provided Docker container.

### Installation and Start

```bash
git clone https://github.com/asterixcapri/croppix.git
cd croppix
cp .env.dist .env
docker compose up -d
docker compose exec node bash
yarn install
yarn dev
```

### Environment Variables

You can create a `.env` file in the project root with:

```env
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_REGION=your-region
AWS_BUCKET=your-source-bucket
AWS_BUCKET_CACHE=your-cache-bucket
```

The Docker container will automatically load these variables if referenced in `docker-compose.yml`.

## 💬 Support & Contributions

Found a bug or want to add a feature?

Open an [Issue](https://github.com/asterixcapri/croppix/issues) or a [Pull Request](https://github.com/asterixcapri/croppix/pulls).

## ⚖️ License

Distributed under the [MIT license](LICENSE).

---

Developed by [Alessandro Astarita](https://github.com/asterixcapri)
