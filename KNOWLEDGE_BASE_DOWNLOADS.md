# Knowledge Base Document Downloads

This feature enables users to download the source documents that the Bedrock Agent references when generating responses.

## Overview

When the Bedrock Agent responds to user queries using information from its knowledge base (S3-stored documents), it provides citations that reference the source documents. This feature captures those citations and displays them in the UI with download capabilities.

## Architecture

```
User Query → Bedrock Agent → Response with Citations
                                    ↓
                              S3 Document URIs
                                    ↓
                        Lambda Function (s3-presigned-url)
                                    ↓
                          Presigned URL (1 hour expiry)
                                    ↓
                          User Downloads Document
```

## How It Works

### 1. Bedrock Agent Response Processing

When the Bedrock Agent streams responses, it includes:
- **Text chunks**: The actual response text
- **Citation events**: References to source documents with:
  - S3 URI of the document
  - Relevant excerpt/preview of the cited text
  - Metadata about the document

### 2. Citation Capture

The `ChatInterface.jsx` component listens for citation events in the response stream:

```javascript
for await (const event of response.completion) {
  if (event.citation) {
    if (event.citation.retrievedReferences) {
      citations.push(...event.citation.retrievedReferences)
    }
  }
}
```

### 3. Secure File Access

Files are accessed securely through a Lambda function that:
1. Validates the S3 bucket matches the expected knowledge base bucket
2. Generates a presigned URL with 1-hour expiration
3. Returns the URL to the frontend for download

**Lambda Function**: `amplify/functions/s3-presigned-url/`

### 4. User Interface

Citations are displayed below each AI response with:
- 📚 Section header showing the count of referenced documents
- 📄 Individual citation cards showing:
  - Document filename
  - Text preview of the cited passage
  - Download button
- Loading state while downloading

## Configuration

### Backend Setup

The feature is automatically configured when you deploy the Amplify backend:

1. **Lambda Function**: Creates `s3-presigned-url` function with S3 GetObject permissions
2. **IAM Permissions**: Grants authenticated users permission to invoke the Lambda function
3. **S3 Bucket**: Uses the existing `knowledge-base-thelexai-laws-datasource-cri` bucket

### Frontend Configuration

No additional configuration needed. The feature is enabled by default in the chat interface.

## IAM Permissions Required

### Authenticated User Role
```json
{
  "Effect": "Allow",
  "Action": ["lambda:InvokeFunction"],
  "Resource": "arn:aws:lambda:us-east-2:*:function:s3-presigned-url"
}
```

### Lambda Execution Role
```json
{
  "Effect": "Allow",
  "Action": ["s3:GetObject"],
  "Resource": "arn:aws:s3:::knowledge-base-thelexai-laws-datasource-cri/*"
}
```

## Security Considerations

1. **Presigned URLs**: Short-lived (1 hour max) to prevent unauthorized long-term access
2. **Bucket Validation**: Lambda validates that requests only access the designated knowledge base bucket
3. **Authentication Required**: Only authenticated users can invoke the Lambda function
4. **No Direct S3 Access**: Users never get direct S3 credentials or bucket access

## User Experience

When the AI references a document:

1. A "Referenced Documents" section appears below the response
2. Each document shows:
   - Clear filename
   - Preview of the cited text
   - Visual download button with icon
3. Clicking "Download" triggers:
   - Button shows loading state (⏳ Downloading...)
   - Lambda generates presigned URL
   - Browser downloads the file
   - Button returns to ready state

## Responsive Design

The feature is fully responsive:
- **Desktop**: Citations displayed in a clean card layout with side-by-side info and button
- **Mobile**: Citations stack vertically with full-width download buttons

## Troubleshooting

### Downloads Not Working

1. **Check IAM Permissions**: Ensure authenticated user role has Lambda invoke permission
2. **Verify Lambda Deployment**: Confirm `s3-presigned-url` function is deployed
3. **Check S3 Bucket Access**: Verify Lambda role has S3 GetObject permission
4. **Browser Console**: Look for error messages in the browser developer console

### No Citations Displayed

1. **Knowledge Base Configuration**: Ensure Bedrock Agent has a knowledge base attached
2. **Data Source**: Verify the knowledge base has documents in S3
3. **Agent Configuration**: Check that the agent is configured to return citations

### Common Error Messages

- **"No AWS credentials found"**: User authentication session expired, sign in again
- **"Access denied. Invalid bucket"**: S3 URI references a bucket other than the configured one
- **"Failed to download file"**: Presigned URL expired or S3 object was deleted

## Development

### Testing Locally

To test the feature locally:

1. Ensure you have valid AWS credentials configured
2. Deploy the backend with `amplify push`
3. Run the dev server with `npm run dev`
4. Ask the AI questions that would trigger knowledge base lookups
5. Check that citations appear and downloads work

### Customization

#### Change Presigned URL Expiration

Edit `amplify/functions/s3-presigned-url/handler.ts`:

```typescript
const presignedUrl = await getSignedUrl(s3Client, command, {
  expiresIn: 7200, // 2 hours instead of 1
});
```

#### Modify Citation Display

Edit `src/components/ChatInterface.jsx` and `src/components/ChatInterface.css` to customize:
- Citation card appearance
- Download button styling
- Text preview length

## Future Enhancements

Possible improvements:
- Document preview modal before download
- Download history/favorites
- Bulk download multiple documents
- Document metadata display (date, author, etc.)
- Search within citations
