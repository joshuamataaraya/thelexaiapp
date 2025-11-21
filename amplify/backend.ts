import { defineBackend } from '@aws-amplify/backend';
import { PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { auth } from './auth/resource';
import { data } from './data/resource';
import { cgrDocumentFetcher } from './functions/cgr-document-fetcher/resource';

/**
 * @see https://docs.amplify.aws/react/build-a-backend/ to add storage, functions, and more
 */
const backend = defineBackend({
  auth,
  data,
  cgrDocumentFetcher,
});

// Grant the Lambda function permission to write to the S3 bucket
backend.cgrDocumentFetcher.resources.lambda.addToRolePolicy(
  new PolicyStatement({
    actions: ['s3:PutObject', 's3:PutObjectAcl'],
    resources: ['arn:aws:s3:::knowledge-base-thelexai-laws-datasource-cri/*'],
  })
);
