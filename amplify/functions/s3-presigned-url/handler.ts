import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const s3Client = new S3Client({});
const S3_BUCKET = process.env.S3_BUCKET!;

interface S3PresignedUrlEvent {
  s3Uri?: string;
  expiresIn?: number; // Expiration time in seconds (default: 3600 = 1 hour)
}

interface S3PresignedUrlResponse {
  statusCode: number;
  body: string;
  headers?: {
    'Content-Type': string;
    'Access-Control-Allow-Origin': string;
    'Access-Control-Allow-Headers': string;
  };
}

export const handler = async (event: S3PresignedUrlEvent): Promise<S3PresignedUrlResponse> => {
  console.log('Event:', JSON.stringify(event, null, 2));

  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  try {
    const { s3Uri, expiresIn = 3600 } = event;

    if (!s3Uri) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'Missing required parameter: s3Uri',
        }),
      };
    }

    // Parse S3 URI (format: s3://bucket-name/key)
    const s3UriMatch = s3Uri.match(/^s3:\/\/([^\/]+)\/(.+)$/);
    if (!s3UriMatch) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'Invalid S3 URI format. Expected: s3://bucket-name/key',
        }),
      };
    }

    const [, bucket, key] = s3UriMatch;

    // Validate that the bucket matches our expected bucket
    if (bucket !== S3_BUCKET) {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({
          error: 'Access denied. Invalid bucket.',
        }),
      };
    }

    // Generate presigned URL
    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: key,
    });

    const presignedUrl = await getSignedUrl(s3Client, command, {
      expiresIn: Math.min(expiresIn, 3600), // Max 1 hour
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        presignedUrl,
        expiresIn,
        bucket,
        key,
      }),
    };
  } catch (error) {
    console.error('Error generating presigned URL:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to generate presigned URL',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
    };
  }
};
