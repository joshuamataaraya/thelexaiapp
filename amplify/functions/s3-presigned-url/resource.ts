import { defineFunction } from '@aws-amplify/backend';

// Shared S3 bucket configuration
export const S3_BUCKET = 'knowledge-base-thelexai-laws-datasource-cri';

export const s3PresignedUrl = defineFunction({
  name: 's3-presigned-url',
  entry: './handler.ts',
  timeoutSeconds: 30,
  memoryMB: 256,
  environment: {
    S3_BUCKET: S3_BUCKET,
  },
});
