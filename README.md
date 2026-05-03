# Croppix

[![Docker Pulls](https://img.shields.io/docker/pulls/asterixcapri/croppix)](https://hub.docker.com/r/asterixcapri/croppix)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://www.tldrlegal.com/license/mit-license)
[![GitHub stars](https://img.shields.io/github/stars/asterixcapri/croppix?style=social)](https://github.com/asterixcapri/croppix)

**Croppix** is an image processing service built on [Sharp](https://sharp.pixelplumbing.com/) and [Amazon Rekognition](https://aws.amazon.com/rekognition/). It generates cropped and optimized images from URL parameters and stores cached results on S3.

`csmart` supports two engines:

- `attention`: simplest setup, no Rekognition needed
- `rekognition`: subject-aware smart crop with label detection and face refinement

For the full detection flow, see [SMART_CROP.md](SMART_CROP.md).

## How It Works

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

## Try It Locally

This is the simplest way to test Croppix locally.

### Requirements

- Docker
- AWS credentials with access to your S3 buckets
- one source bucket: `AWS_BUCKET`
- one cache bucket: `AWS_BUCKET_CACHE`

If you want the easiest first run, use `SMART_CROP_ENGINE=attention`.

### Run

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

### Test Request

Request:

```text
http://localhost:3003/photos/image123.jpg/w400_h300_csmart.webp
```

Expected behavior:

- Croppix reads `photos/image123.jpg` from `AWS_BUCKET`
- generates a `400x300` WebP
- stores the result in `AWS_BUCKET_CACHE`
- returns the generated image

The source image must exist in `AWS_BUCKET` at `photos/image123.jpg`.

If you want subject-aware smart crop and have Rekognition permissions configured, switch `SMART_CROP_ENGINE` to `rekognition`.

## URL Format

A Croppix request looks like this:

```text
https://your-croppix-domain.com/<image-path>/<transform-params>.<format>
```

Example:

```text
https://your-croppix-domain.com/photos/image123.jpg/w400_h300_d2_csmart.webp
```

Supported parameters:

| Parameter | Description |
|-----------|-------------|
| `w{width}` | Width in pixels |
| `h{height}` | Height in pixels |
| `s{shortSide}` | Fit to the shortest side |
| `l{longSide}` | Fit to the longest side |
| `c{crop}` | Crop type |
| `q{quality}` | Output quality |
| `d{density}` | Retina scale factor |
| `u{updatedAt}` | Cache busting timestamp |
| `.webp`, `.jpeg`, `.jpg` | Output format |

Parameters can be combined with `_` and used in any order.

## Crop Modes

Croppix supports these values for `c{crop}`:

| Value | Description |
|-------|-------------|
| `smart` | Smart crop using `attention` or `rekognition`, depending on `SMART_CROP_ENGINE` |
| `none` | No crop, keep full image with background fill |
| `entropy` | Sharp entropy strategy |
| `attention` | Sharp attention strategy |
| `center` | Center crop |
| `top` | Top crop |
| `bottom` | Bottom crop |
| `left` | Left crop |
| `right` | Right crop |
| `leftTop` | Top-left crop |
| `rightTop` | Top-right crop |
| `leftBottom` | Bottom-left crop |
| `rightBottom` | Bottom-right crop |

## More Docs

- [DEPLOY.md](DEPLOY.md): AWS deployment, IAM, Docker production, Lambda
- [BUILD.md](BUILD.md): build and release commands
- [SMART_CROP.md](SMART_CROP.md): smart crop internals and thresholds

## License

Distributed under the [MIT license](LICENSE).
