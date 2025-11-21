import { defineFunction } from '@aws-amplify/backend';

export const cgrDocumentFetcher = defineFunction({
  name: 'cgr-document-fetcher',
  entry: './handler.ts',
  timeoutSeconds: 900, // 15 minutes - needed for downloading multiple PDFs
  memoryMB: 512,
});
