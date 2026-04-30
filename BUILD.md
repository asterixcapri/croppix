## Docker images

Croppix publishes two Docker image variants under the same Docker Hub repository:

- Standard runtime:
  - `asterixcapri/croppix:<version>`
  - `asterixcapri/croppix:latest`
- AWS Lambda runtime:
  - `asterixcapri/croppix:<version>-lambda`
  - `asterixcapri/croppix:lambda-latest`

The recommended release path is:

1. bump `package.json` version
2. push to `main`
3. publish a GitHub Release
4. let GitHub Actions publish both Docker images

## Local builds

### Standard image

Build:

```bash
docker build --no-cache \
  -t asterixcapri/croppix:2.1.1 \
  -t asterixcapri/croppix:latest \
  .
```

Build multi-arch and push:

```bash
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  --no-cache \
  -t asterixcapri/croppix:2.1.1 \
  -t asterixcapri/croppix:latest \
  . \
  --push
```

Run:

```bash
docker run --rm -it -p 3003:3003 asterixcapri/croppix:latest
```

### Lambda image

Build:

```bash
docker build -f Dockerfile.lambda --provenance=false --no-cache \
  -t asterixcapri/croppix:2.1.1-lambda \
  -t asterixcapri/croppix:lambda-latest \
  .
```

Build multi-arch and push:

```bash
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  --provenance=false \
  --no-cache \
  -f Dockerfile.lambda \
  -t asterixcapri/croppix:2.1.1-lambda \
  -t asterixcapri/croppix:lambda-latest \
  . \
  --push
```

## AWS Lambda deploy

For Lambda-based deployments, publish the `-lambda` image and update the function to the new image URI.

Example:

```bash
docker build -f Dockerfile.lambda --provenance=false -t croppix-lambda .
docker tag croppix-lambda <account-id>.dkr.ecr.<region>.amazonaws.com/croppix:latest
docker push <account-id>.dkr.ecr.<region>.amazonaws.com/croppix:latest
aws lambda update-function-code \
  --function-name croppix \
  --image-uri <account-id>.dkr.ecr.<region>.amazonaws.com/croppix:latest
```
