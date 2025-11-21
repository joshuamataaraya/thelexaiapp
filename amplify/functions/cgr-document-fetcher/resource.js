import { defineFunction } from '@aws-amplify/backend';
// Shared S3 bucket configuration
export const CGR_DOCUMENTS_BUCKET = 'knowledge-base-thelexai-laws-datasource-cri';
export const cgrDocumentFetcher = defineFunction({
    name: 'cgr-document-fetcher',
    entry: './handler.ts',
    timeoutSeconds: 900,
    memoryMB: 512,
    environment: {
        S3_BUCKET: CGR_DOCUMENTS_BUCKET,
    },
});
