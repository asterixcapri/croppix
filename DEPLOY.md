# AWS Deploy Runbook

This document is the operational runbook for deploying Croppix on AWS.

Recommended mode:

- single source bucket with `AWS_BUCKET`
- one cache bucket with `AWS_BUCKET_CACHE`
- Lambda container image behind CloudFront
- CloudFront primary origin: S3 cache bucket
- CloudFront fallback origin: Lambda Function URL with `AWS_IAM` auth and OAC

## 1. Set Variables

```bash
export AWS_REGION=<region>
export ACCOUNT_ID=$(aws sts get-caller-identity --query 'Account' --output text)

export SOURCE_BUCKET=your-source-bucket
export CACHE_BUCKET=your-cache-bucket

export ECR_REPO=croppix
export FUNCTION_NAME=croppix
export ROLE_NAME=croppix-lambda-role
export POLICY_NAME=croppix-access
```

## 2. Create the Cache Bucket

```bash
aws s3 mb "s3://$CACHE_BUCKET" --region "$AWS_REGION"

aws s3api put-public-access-block \
  --bucket "$CACHE_BUCKET" \
  --public-access-block-configuration BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true \
  --region "$AWS_REGION"
```

`$SOURCE_BUCKET` must already exist and contain the original images.

## 3. Create the Lambda Role

Create the trust policy:

```bash
cat > trust-policy.json <<'EOF'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "lambda.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
EOF
```

Create the role:

```bash
aws iam create-role \
  --role-name "$ROLE_NAME" \
  --assume-role-policy-document file://trust-policy.json

aws iam attach-role-policy \
  --role-name "$ROLE_NAME" \
  --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole
```

Create the Croppix access policy:

```bash
cat > croppix-policy.json <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject"
      ],
      "Resource": [
        "arn:aws:s3:::$SOURCE_BUCKET/*"
      ]
    },
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject"
      ],
      "Resource": [
        "arn:aws:s3:::$CACHE_BUCKET/*"
      ]
    }
  ]
}
EOF
```

If you want `SMART_CROP_ENGINE=rekognition`, add this statement inside `croppix-policy.json` before applying it:

```json
{
  "Effect": "Allow",
  "Action": [
    "rekognition:DetectLabels",
    "rekognition:DetectFaces"
  ],
  "Resource": "*"
}
```

Apply the inline policy and get the role ARN:

```bash
aws iam put-role-policy \
  --role-name "$ROLE_NAME" \
  --policy-name "$POLICY_NAME" \
  --policy-document file://croppix-policy.json

export ROLE_ARN=$(aws iam get-role \
  --role-name "$ROLE_NAME" \
  --query 'Role.Arn' \
  --output text)
```

## 4. Push the Lambda Image to ECR

Create the ECR repository:

```bash
aws ecr create-repository \
  --repository-name "$ECR_REPO" \
  --region "$AWS_REGION"
```

Croppix publishes the Lambda image on Docker Hub as `asterixcapri/croppix:lambda-latest`.

Lambda container images must be stored in ECR. Mirror the published image into your ECR repository, then continue with the AWS CLI commands below.

```bash
docker pull asterixcapri/croppix:lambda-latest

aws ecr get-login-password --region "$AWS_REGION" | \
  docker login --username AWS --password-stdin "$ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com"

docker tag asterixcapri/croppix:lambda-latest "$ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$ECR_REPO:latest"
docker push "$ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$ECR_REPO:latest"
```

Once the image is in ECR, set:

```bash
export IMAGE_URI="$ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$ECR_REPO:latest"
```

## 5. Create the Lambda Function

Recommended default: single-bucket mode.

```bash
aws lambda create-function \
  --function-name "$FUNCTION_NAME" \
  --package-type Image \
  --code ImageUri="$IMAGE_URI" \
  --role "$ROLE_ARN" \
  --memory-size 1024 \
  --timeout 60 \
  --environment "Variables={AWS_BUCKET=$SOURCE_BUCKET,AWS_BUCKET_CACHE=$CACHE_BUCKET}" \
  --region "$AWS_REGION"
```

If you want the simplest setup:

```bash
aws lambda update-function-configuration \
  --function-name "$FUNCTION_NAME" \
  --environment "Variables={AWS_BUCKET=$SOURCE_BUCKET,AWS_BUCKET_CACHE=$CACHE_BUCKET,SMART_CROP_ENGINE=attention}" \
  --region "$AWS_REGION"
```

If you want Rekognition-based smart crop:

```bash
aws lambda update-function-configuration \
  --function-name "$FUNCTION_NAME" \
  --environment "Variables={AWS_BUCKET=$SOURCE_BUCKET,AWS_BUCKET_CACHE=$CACHE_BUCKET,SMART_CROP_ENGINE=rekognition}" \
  --region "$AWS_REGION"
```

## 6. Create the Function URL

```bash
export FUNCTION_URL=$(aws lambda create-function-url-config \
  --function-name "$FUNCTION_NAME" \
  --auth-type AWS_IAM \
  --region "$AWS_REGION" \
  --query 'FunctionUrl' \
  --output text)

export FUNCTION_URL_HOST=${FUNCTION_URL#https://}
export FUNCTION_URL_HOST=${FUNCTION_URL_HOST%/}
```

## 7. Create the Origin Access Controls

```bash
export S3_OAC_ID=$(aws cloudfront create-origin-access-control \
  --origin-access-control-config Name="croppix-cache-oac",SigningProtocol=sigv4,SigningBehavior=always,OriginAccessControlOriginType=s3 \
  --query 'OriginAccessControl.Id' \
  --output text)

export LAMBDA_OAC_ID=$(aws cloudfront create-origin-access-control \
  --origin-access-control-config Name="croppix-lambda-oac",SigningProtocol=sigv4,SigningBehavior=always,OriginAccessControlOriginType=lambda \
  --query 'OriginAccessControl.Id' \
  --output text)
```

## 8. Create the CloudFront Distribution

Create the distribution config:

```bash
cat > distribution-config.json <<EOF
{
  "CallerReference": "croppix-$(date +%s)",
  "Comment": "Croppix distribution",
  "Enabled": true,
  "Origins": {
    "Quantity": 2,
    "Items": [
      {
        "Id": "s3-cache-origin",
        "DomainName": "$CACHE_BUCKET.s3.$AWS_REGION.amazonaws.com",
        "S3OriginConfig": {
          "OriginAccessIdentity": ""
        },
        "OriginAccessControlId": "$S3_OAC_ID"
      },
      {
        "Id": "lambda-url-origin",
        "DomainName": "$FUNCTION_URL_HOST",
        "OriginAccessControlId": "$LAMBDA_OAC_ID",
        "CustomOriginConfig": {
          "HTTPPort": 80,
          "HTTPSPort": 443,
          "OriginProtocolPolicy": "https-only",
          "OriginSslProtocols": {
            "Quantity": 1,
            "Items": ["TLSv1.2"]
          }
        }
      }
    ]
  },
  "OriginGroups": {
    "Quantity": 1,
    "Items": [
      {
        "Id": "croppix-origin-group",
        "FailoverCriteria": {
          "StatusCodes": {
            "Quantity": 2,
            "Items": [403, 404]
          }
        },
        "Members": {
          "Quantity": 2,
          "Items": [
            { "OriginId": "s3-cache-origin" },
            { "OriginId": "lambda-url-origin" }
          ]
        }
      }
    ]
  },
  "DefaultCacheBehavior": {
    "TargetOriginId": "croppix-origin-group",
    "ViewerProtocolPolicy": "redirect-to-https",
    "AllowedMethods": {
      "Quantity": 2,
      "Items": ["GET", "HEAD"],
      "CachedMethods": {
        "Quantity": 2,
        "Items": ["GET", "HEAD"]
      }
    },
    "Compress": true,
    "ForwardedValues": {
      "QueryString": false,
      "Cookies": {
        "Forward": "none"
      }
    },
    "MinTTL": 0,
    "DefaultTTL": 86400,
    "MaxTTL": 31536000
  }
}
EOF
```

Create the distribution:

```bash
export DISTRIBUTION_ID=$(aws cloudfront create-distribution \
  --distribution-config file://distribution-config.json \
  --query 'Distribution.Id' \
  --output text)

export CLOUDFRONT_DOMAIN=$(aws cloudfront get-distribution \
  --id "$DISTRIBUTION_ID" \
  --query 'Distribution.DomainName' \
  --output text)
```

## 9. Allow CloudFront to Reach the Origins

Allow CloudFront to invoke the Lambda Function URL:

```bash
aws lambda add-permission \
  --function-name "$FUNCTION_NAME" \
  --statement-id AllowCloudFrontServicePrincipalInvokeURL \
  --action lambda:InvokeFunctionUrl \
  --principal cloudfront.amazonaws.com \
  --source-arn "arn:aws:cloudfront::$ACCOUNT_ID:distribution/$DISTRIBUTION_ID" \
  --function-url-auth-type AWS_IAM \
  --region "$AWS_REGION"

aws lambda add-permission \
  --function-name "$FUNCTION_NAME" \
  --statement-id AllowCloudFrontServicePrincipalInvokeFunction \
  --action lambda:InvokeFunction \
  --principal cloudfront.amazonaws.com \
  --source-arn "arn:aws:cloudfront::$ACCOUNT_ID:distribution/$DISTRIBUTION_ID" \
  --region "$AWS_REGION"
```

Allow CloudFront to read the cache bucket:

```bash
cat > cache-bucket-policy.json <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowCloudFrontServicePrincipalReadOnly",
      "Effect": "Allow",
      "Principal": {
        "Service": "cloudfront.amazonaws.com"
      },
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::$CACHE_BUCKET/*",
      "Condition": {
        "StringEquals": {
          "AWS:SourceArn": "arn:aws:cloudfront::$ACCOUNT_ID:distribution/$DISTRIBUTION_ID"
        }
      }
    }
  ]
}
EOF

aws s3api put-bucket-policy \
  --bucket "$CACHE_BUCKET" \
  --policy file://cache-bucket-policy.json \
  --region "$AWS_REGION"
```

## 10. Wait for Deployment

```bash
aws cloudfront wait distribution-deployed --id "$DISTRIBUTION_ID"
```

## 11. Test the Setup

Single-bucket mode:

```text
https://$CLOUDFRONT_DOMAIN/photos/image123.jpg/w400_h300_csmart.webp
```

Expected behavior:

1. First request:
   - S3 cache returns `403` or `404`
   - CloudFront falls back to Lambda
   - Croppix reads the source image from `AWS_BUCKET`
   - Croppix writes the transformed image to `AWS_BUCKET_CACHE`
2. Second request:
   - CloudFront serves the cached object from S3

## 12. Update the Lambda Image

Push the new image to the same ECR tag, then run:

```bash
aws lambda update-function-code \
  --function-name "$FUNCTION_NAME" \
  --image-uri "$IMAGE_URI" \
  --region "$AWS_REGION"
```

## Multi-Tenant Mode

Multi-tenant mode is optional.

To enable it:

- do not set `AWS_BUCKET`
- update the Lambda environment to keep only `AWS_BUCKET_CACHE`
- expand IAM `s3:GetObject` permissions to every source bucket you intentionally allow

Example:

```bash
aws lambda update-function-configuration \
  --function-name "$FUNCTION_NAME" \
  --environment "Variables={AWS_BUCKET_CACHE=$CACHE_BUCKET,SMART_CROP_ENGINE=attention}" \
  --region "$AWS_REGION"
```

Multi-tenant request shape:

```text
https://$CLOUDFRONT_DOMAIN/my-source-bucket/photos/image123.jpg/w400_h300_csmart.webp
```

Security note:

- in multi-tenant mode, the caller chooses the source bucket via the URL
- actual access is still limited by the Lambda IAM role
- keep single-bucket mode as the default unless multi-tenant behavior is intentional
- in the default setup above, the Lambda Function URL is not public and is intended to be reachable through CloudFront
