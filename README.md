# Croppix

[![Docker Pulls](https://img.shields.io/docker/pulls/asterixcapri/croppix)](https://hub.docker.com/r/asterixcapri/croppix)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://www.tldrlegal.com/license/mit-license)
[![GitHub stars](https://img.shields.io/github/stars/asterixcapri/croppix?style=social)](https://github.com/asterixcapri/croppix)

**Croppix** is an open-source image processing service built on [Sharp](https://sharp.pixelplumbing.com/) and [Amazon Rekognition](https://aws.amazon.com/rekognition/). It generates cropped and optimized images from URL parameters and caches results on AWS S3.

Smart crop can use Amazon Rekognition to detect the main subject, rank subject categories from label instances, and refine human subjects with face detection when available.

The `csmart` crop mode can be switched between two engines with the `SMART_CROP_ENGINE` environment variable: `rekognition` or `attention`.

For the full detection flow and thresholds, see [SMART_CROP.md](SMART_CROP.md).

Croppix is designed for high-performance websites, serving optimized images through a CDN such as CloudFront with automatic fallback to the processor on cache miss.

## 📦 Distribution

Croppix is published as two Docker image variants under the same Docker Hub repository:

- Standard runtime:
  - `asterixcapri/croppix:<version>`
  - `asterixcapri/croppix:latest`
- AWS Lambda runtime:
  - `asterixcapri/croppix:<version>-lambda`
  - `asterixcapri/croppix:lambda-latest`

Docker images are published automatically when a GitHub Release is published.

## 🔍 Table of Contents

- [✅ Recommended Path](#-recommended-path)
- [⚡ Quick Start](#-quick-start)
- [🧭 Choosing a Setup](#-choosing-a-setup)
- [🚀 Architecture and Production Deployment](#🚀-architecture-and-production-deployment)
- [🔧 Docker Deployment](#-docker-deployment)
- [⚡ AWS Lambda Deployment](#⚡-aws-lambda-deployment)
- [📂 URL Parameters for Image Transformations](#📂-url-parameters-for-image-transformations)
- [✂️ Supported Crop Types (`c{crop}`)](#✂️-supported-crop-types-ccrop)
- [🧑‍💻 Local Development Setup](#🧑‍💻-local-development-setup)
- [⚖️ License](#⚖️-license)

## ✅ Recommended Path

If you are evaluating Croppix or deploying it for the first time, start with this setup:

- one S3 bucket for originals: `AWS_BUCKET`
- one S3 bucket for transformed images: `AWS_BUCKET_CACHE`
- one Croppix container
- one CloudFront distribution in front of the cache bucket and Croppix
- `SMART_CROP_ENGINE=attention` if you want the simplest setup
- `SMART_CROP_ENGINE=rekognition` if you want subject-aware smart crop

This is the simplest path to production with good cache behavior and minimal moving parts.

### Request Flow

```text
Browser
  ↓
CloudFront
  ├─ cache hit on S3 cache bucket → serve image
  └─ cache miss → Croppix
                  ├─ read source from S3
                  ├─ transform image
                  ├─ save result to S3 cache
                  └─ return image
```

## ⚡ Quick Start

This example uses the standard Docker image and one source bucket.

1. Run Croppix:

```bash
docker run -p 3003:3003 \
  -e AWS_ACCESS_KEY_ID=xxx \
  -e AWS_SECRET_ACCESS_KEY=xxx \
  -e AWS_REGION=us-east-1 \
  -e AWS_BUCKET=your-source-bucket \
  -e AWS_BUCKET_CACHE=your-cache-bucket \
  -e SMART_CROP_ENGINE=attention \
  asterixcapri/croppix:latest
```

2. Request a transformed image:

```text
http://localhost:3003/photos/image123.jpg/w400_h300_csmart.webp
```

The source image must exist in `AWS_BUCKET` at `photos/image123.jpg`.

3. Expected result:

- Croppix reads `photos/image123.jpg` from `AWS_BUCKET`
- generates a `400x300` WebP
- stores the processed image in `AWS_BUCKET_CACHE`
- returns the generated image

If you want subject-aware smart crop and have Rekognition permissions configured, switch `SMART_CROP_ENGINE` to `rekognition`.

## 🧭 Choosing a Setup

| Need | Recommended choice |
|------|--------------------|
| Fastest evaluation or simplest setup | Docker + `SMART_CROP_ENGINE=attention` |
| Best smart crop on people, pets, or clear subjects | Docker or Lambda + `SMART_CROP_ENGINE=rekognition` |
| Predictable, always-on traffic | Standard Docker deployment |
| Low traffic or bursty workloads | AWS Lambda deployment |
| One deployment serving multiple source buckets | Lambda multi-tenant mode |

## 🚀 Architecture and Production Deployment

Croppix typically runs as a Node.js service behind an Ingress (NGINX or ALB), with original images stored in `AWS_BUCKET` and processed images stored in `AWS_BUCKET_CACHE`.

Docker is the recommended deployment target, usually behind CloudFront.

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

## 🔧 Docker Deployment

Croppix is also available as a Docker container:

👉 [https://hub.docker.com/r/asterixcapri/croppix](https://hub.docker.com/r/asterixcapri/croppix)

Use the standard image when you want a long-running processor behind a load balancer or CDN.

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

- 🤖 **AI-powered smart crop** using Rekognition labels, optional face refinement, and Sharp fallback
- ⚡ High performance via CloudFront + S3
- 👊 Croppix server is hit only on cache misses
- 📆 Fully cacheable and URL-customizable images
- 🚪 Robust system with automatic fallback
- ✨ On-demand image generation via URL
- 📁 Integration with AWS S3 for source and cache
- ⚡ Output in WebP, JPEG, PNG and more
- 🔄 Smart crop, resize, retina scaling, cache busting
- ⚙ Docker-ready

## ⚡ AWS Lambda Deployment

Croppix can also run as an **AWS Lambda function** using a container image. This is a good fit for low-traffic sites where you do not want to run a server continuously. Lambda processes images on demand and caches them on S3.

### Lambda Architecture

```
Client → CloudFront
           ├── Origin 1 (Primary): S3 cache bucket
           │   └── Cache hit → serve immediately
           └── Origin 2 (Fallback on 403/404): Lambda Function URL
               └── Process image → save to S3 cache → return
```

After the first request for each image variant, later requests are served directly from S3 via CloudFront, so Lambda is not invoked again for that variant.

### Multi-Tenant Mode

When `AWS_BUCKET` is **not set**, Croppix extracts the source bucket name from the first URL path segment. This allows a single Lambda deployment to serve multiple sites:

```
/<bucket>/<image-path>/<params>.<format>
```

Example:
```
https://your-cloudfront.net/my-site-bucket/images/hero.jpg/w800.webp
https://your-cloudfront.net/another-site-bucket/photos/pool.jpg/w400.webp
```

When `AWS_BUCKET` **is set** (e.g., in Docker), the URL format remains unchanged:
```
/<image-path>/<params>.<format>
```

### Building the Lambda Image

```bash
docker build -f Dockerfile.lambda --provenance=false -t croppix-lambda .
```

> **Note:** `--provenance=false` is required to produce a Docker v2 manifest compatible with AWS Lambda.

### Deploying to AWS

```bash
# 1. Create ECR repository (one-time)
aws ecr create-repository --repository-name croppix

# 2. Login, tag and push
aws ecr get-login-password | docker login --username AWS --password-stdin <account-id>.dkr.ecr.<region>.amazonaws.com
docker tag croppix-lambda <account-id>.dkr.ecr.<region>.amazonaws.com/croppix:latest
docker push <account-id>.dkr.ecr.<region>.amazonaws.com/croppix:latest

# 3. Create Lambda function
aws lambda create-function \
  --function-name croppix \
  --package-type Image \
  --code ImageUri=<account-id>.dkr.ecr.<region>.amazonaws.com/croppix:latest \
  --role <lambda-role-arn> \
  --memory-size 1024 \
  --timeout 60 \
  --environment "Variables={AWS_BUCKET_CACHE=your-cache-bucket}"

# 4. Create Function URL (public access)
aws lambda create-function-url-config --function-name croppix --auth-type NONE
aws lambda add-permission --function-name croppix \
  --statement-id FunctionURLAllowPublicAccess \
  --action lambda:InvokeFunctionUrl --principal "*" --function-url-auth-type NONE
aws lambda add-permission --function-name croppix \
  --statement-id FunctionURLInvokeAllowPublicAccess \
  --action lambda:InvokeFunction --principal "*"
```

Then configure a CloudFront distribution with an **Origin Group** (failover):
- **Primary**: S3 cache bucket (with Origin Access Control)
- **Fallback** (on 403/404): Lambda Function URL

### Updating the Lambda

```bash
docker build -f Dockerfile.lambda --provenance=false -t croppix-lambda .
docker tag croppix-lambda <account-id>.dkr.ecr.<region>.amazonaws.com/croppix:latest
docker push <account-id>.dkr.ecr.<region>.amazonaws.com/croppix:latest
aws lambda update-function-code --function-name croppix \
  --image-uri <account-id>.dkr.ecr.<region>.amazonaws.com/croppix:latest
```

### Lambda Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `AWS_BUCKET_CACHE` | Yes | S3 bucket for cached processed images |
| `AWS_BUCKET` | No | Source S3 bucket. If not set, multi-tenant mode is enabled (bucket extracted from URL) |

### AWS Credentials

Croppix uses the default AWS SDK credential chain. On Lambda, credentials are automatically provided by the IAM execution role — no `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` needed. In Docker, the SDK reads them from environment variables automatically.

## 📂 URL Parameters for Image Transformations

A Croppix image request looks like this:

```
https://your-croppix-domain.com/<image-path>/<transform-params>.<format>
```

### ✅ Example

```
https://your-croppix-domain.com/photos/image123.jpg/w400_h300_d2_csmart_u1712345678.webp
```

### Remote Source URLs

Croppix also supports remote source images. In that case, the source URL becomes the image path:

```
https://your-croppix-domain.com/https://images.example.com/photo.jpg/w800.webp
```

If the remote source URL contains a query string, the full source URL must be URL-encoded before being embedded into the Croppix path:

```
https://your-croppix-domain.com/https%3A%2F%2Fimages.example.com%2Fphoto.jpg%3Fw%3D800%26h%3D600/w1200.webp
```

In multi-tenant mode, the source bucket stays as the first path segment, followed by the encoded remote URL:

```
https://your-croppix-domain.com/<bucket>/https%3A%2F%2Fimages.example.com%2Fphoto.jpg%3Fw%3D800%26h%3D600/w1200.webp
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
| `u{updatedAt}`   | Cache busting timestamp (e.g., `u1684485984`) |
| `.webp`, `.jpeg`, `.png` | Output format |

Parameters can be combined with `_` and used in any order.

### Validation & HTTP Status Codes

- If the URL is syntactically invalid, the format is not supported, or a parameter is out of range, Croppix returns **404 Not Found**.
  - Examples: `w{width}` / `h{height}` / `s{shortSide}` / `l{longSide}` > `maxDimension`, `d{density}` outside `[1.0, maxDensity]`, unsupported `c{crop}` or `q{quality}`.
- If the source image key does not exist in S3, Croppix returns **404 Not Found**.
- Any internal processing error (Sharp, Rekognition, or other runtime errors) results in **500 Internal Server Error**.

> **Tip:** To get the original image without any transformations, use `/original`:
> - `https://your-croppix-domain.com/photos/image123.jpg/original` (same format as source)

## ✂️ Supported Crop Types (`c{crop}`)

Croppix supports the following crop modes via `c{crop}`.

> **Note:** With `SMART_CROP_ENGINE=rekognition`, the `smart` crop uses Amazon Rekognition `DetectLabels` as the primary signal, ranks known subject categories, merges multi-instance subjects for selected labels, and uses `DetectFaces` only to refine human subjects. If detection fails or no usable subject is found, it falls back to Sharp's `attention` strategy.

> **Engine selection:** set `SMART_CROP_ENGINE=rekognition` or `SMART_CROP_ENGINE=attention` to choose how `csmart` behaves without changing URLs.

| Value        | Description |
|---------------|----------------------------------------------------------------------------------|
| `smart`       | AI-powered smart crop using Rekognition labels, optional face refinement, and Sharp fallback |
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

To generate Croppix URLs in a frontend app:

```js
const croppixBaseUrl = 'https://your-croppix-domain.com';

export const croppixUrl = (path, params = {}) => {
  if (!path) return '';
  const encodedPath = path.startsWith('http://') || path.startsWith('https://')
    ? '/' + encodeURIComponent(path)
    : encodeURI(path);
  return croppixBaseUrl + encodedPath + formatParams(params);
};

const formatParams = (params = {}) => {
  const parts = [];
  if (params?.width) parts.push(`w${params.width}`);
  if (params?.height) parts.push(`h${params.height}`);
  if (params?.shortSide) parts.push(`s${params.shortSide}`);
  if (params?.longSide) parts.push(`l${params.longSide}`);
  if (params?.crop) parts.push(`c${params.crop}`);
  if (params?.quality) parts.push(`q${params.quality}`);
  if (params?.density) parts.push(`d${params.density}`);
  if (params?.updatedAt) parts.push(`u${params.updatedAt}`);

  if (parts.length === 0) return '/original';
  return '/' + parts.join('_') + '.' + (params?.format || 'jpeg');
};
```

## 🧑‍💻 Local Development Setup

### Requirements

- Docker installed
- AWS credentials with access to your S3 buckets
- Two S3 buckets:
  - `AWS_BUCKET` for original images
  - `AWS_BUCKET_CACHE` for processed images
- Amazon Rekognition permissions only if you use `SMART_CROP_ENGINE=rekognition`

Everything else is handled by the provided Docker container.

### Installation and Start

```bash
git clone https://github.com/asterixcapri/croppix.git
cd croppix
cp .env.dist .env
docker compose up -d
docker compose exec node bash
npm install
npm run dev
```

### Environment Variables

You can create a `.env` file in the project root with:

```env
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_REGION=your-region
AWS_BUCKET=your-source-bucket
AWS_BUCKET_CACHE=your-cache-bucket
SMART_CROP_ENGINE=rekognition
```

The Docker container loads these variables automatically if they are referenced in `docker-compose.yml`.

Supported `SMART_CROP_ENGINE` values:

- `rekognition`: Rekognition `DetectLabels` subject detection, optional `DetectFaces` refinement for human subjects, plus Sharp attention fallback
- `attention`: Sharp's built-in attention strategy only

> **Note:** `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` are read automatically by the AWS SDK from environment variables — they don't need to be passed explicitly in code. On Lambda, the SDK uses the IAM execution role instead.

### IAM Permissions

The AWS credentials must have the following permissions:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject"
      ],
      "Resource": [
        "arn:aws:s3:::your-source-bucket/*",
        "arn:aws:s3:::your-cache-bucket/*"
      ]
    },
    {
      "Effect": "Allow",
      "Action": [
        "rekognition:DetectLabels",
        "rekognition:DetectFaces"
      ],
      "Resource": "*"
    }
  ]
}
```

The `rekognition:DetectLabels` permission is required when `SMART_CROP_ENGINE=rekognition`. `rekognition:DetectFaces` is additionally required for human-subject refinement.

## 💬 Support & Contributions

Found a bug or want to add a feature?

Open an [Issue](https://github.com/asterixcapri/croppix/issues) or a [Pull Request](https://github.com/asterixcapri/croppix/pulls).

## ⚖️ License

Distributed under the [MIT license](LICENSE).

---

Developed by [Alessandro Astarita](https://github.com/asterixcapri)
