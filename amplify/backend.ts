import { defineBackend } from '@aws-amplify/backend';
import { PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { auth } from './auth/resource';
import { data } from './data/resource';
import { cgrDocumentFetcher, CGR_DOCUMENTS_BUCKET } from './functions/cgr-document-fetcher/resource';
import { s3PresignedUrl, S3_BUCKET } from './functions/s3-presigned-url/resource';

/**
 * @see https://docs.amplify.aws/react/build-a-backend/ to add storage, functions, and more
 */
const backend = defineBackend({
  auth,
  data,
  cgrDocumentFetcher,
  s3PresignedUrl,
});

// Grant the Lambda function permission to write to the S3 bucket
backend.cgrDocumentFetcher.resources.lambda.addToRolePolicy(
  new PolicyStatement({
    actions: ['s3:PutObject', 's3:PutObjectAcl'],
    resources: [`arn:aws:s3:::${CGR_DOCUMENTS_BUCKET}/*`],
  })
);

// Grant the presigned URL function permission to read from the S3 bucket
backend.s3PresignedUrl.resources.lambda.addToRolePolicy(
  new PolicyStatement({
    actions: ['s3:GetObject'],
    resources: [`arn:aws:s3:::${S3_BUCKET}/*`],
  })
);
