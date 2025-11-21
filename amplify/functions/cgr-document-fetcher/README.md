# CGR Document Fetcher Lambda Function

This Lambda function automatically fetches legal documents from the Costa Rica Contraloría General de la República (CGR) website and stores them in S3 for the knowledge base.

## Overview

The function:
1. Fetches CSV data from all available pages on the CGR search portal
2. Parses CSV records to extract document metadata
3. Downloads PDF files from the extracted URLs
4. Uploads PDFs to S3 with associated metadata

## Configuration

- **S3 Bucket**: `knowledge-base-thelexai-laws-datasource-cri`
- **Timeout**: 15 minutes (900 seconds)
- **Memory**: 512 MB
- **Concurrency**: 5 parallel PDF downloads per batch
- **IAM Permissions**: S3 PutObject and PutObjectAcl

## Usage

### Invoke with default settings (all pages from page 1)
```json
{}
```

### Invoke with custom starting page
```json
{
  "startPage": 10
}
```

### Invoke with page limits
```json
{
  "startPage": 1,
  "maxPages": 50
}
```

## Response Format

```json
{
  "statusCode": 200,
  "body": {
    "message": "CGR documents processed successfully",
    "results": {
      "totalPages": 25,
      "totalRecords": 150,
      "successful": 148,
      "failed": 2,
      "errors": [
        "Row 45: Failed to download PDF: 404 Not Found",
        "Row 89: Failed to download PDF: 500 Internal Server Error"
      ]
    }
  }
}
```

## S3 Structure

PDFs are stored with the following key format:
```
cgr-documents/2025-11-21T01-23-45-678Z_a1b2c3d4_SIGYD_D_2025026742.pdf
```

Where:
- `2025-11-21T01-23-45-678Z` - ISO timestamp
- `a1b2c3d4` - First segment of UUID for uniqueness
- `SIGYD_D_2025026742.pdf` - Sanitized original filename

## S3 Metadata

Each PDF includes the following metadata (URL-encoded):
- `row` - CSV row number
- `fechaEmision` - Issue date
- `fechaPublicacion` - Publication date
- `institucion` - Institution name
- `emite` - Issuing entity
- `tipoDocumental` - Document type
- `proceso` - Process name
- `asunto` - Subject/topic (truncated to fit S3 limits)
- `sourceUrl` - Original PDF URL

## Pagination Logic

- Fetches first page to determine total document count
- Continues fetching subsequent pages sequentially
- Stops when encountering 3 consecutive empty pages
- Network errors don't count as empty pages (to handle transient failures)
- Can be limited with `maxPages` parameter

## Error Handling

- Individual document failures don't stop the entire process
- Each failure is logged with the row number and error message
- Final response includes summary of successes and failures
- Fetch errors for pages are logged but don't terminate the process

## Development

### Install Dependencies
```bash
cd amplify/functions/cgr-document-fetcher
npm install
```

### Run TypeScript Check
```bash
npx tsc --noEmit handler.ts --skipLibCheck
```

## Source URL

CSV data is fetched from:
```
https://cgrbuscador.cgr.go.cr/BuscadorWebCGR/testcsv
```

With parameters for search criteria and pagination.
