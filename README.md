# thelexaiapp

AI-powered legal consultation chatbot that connects with Amazon Bedrock Agent, built with AWS Amplify, React, and Vite.

## Features

- 🤖 AI Legal Consultant powered by Amazon Bedrock Agent (thelexai-laws-consultant-agent)
- 🔐 AWS Amplify authentication with secure user management
- ⚡️ Vite for fast development and optimized builds
- ⚛️ React 19 for modern UI development
- 🎨 Beautiful, responsive chat interface
- 💬 Conversational session management with Bedrock Agent
- 📚 **Knowledge Base Document Downloads** - View and download source documents from S3 that the AI references in responses
- 📦 Ready for AWS Amplify deployment

## Prerequisites

- Node.js 18+ and npm
- AWS Account with access to:
  - Amazon Cognito (for authentication)
  - Amazon Bedrock Agents (specifically the thelexai-laws-consultant-agent)
- AWS Amplify CLI (optional, for local backend development)
- Bedrock Agent ID and Alias ID for your deployed agent

## Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/joshuamataaraya/thelexaiapp.git
cd thelexaiapp
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure Environment Variables

Create a `.env` file in the root directory (copy from `.env.example`):

```bash
cp .env.example .env
```

Update the `.env` file with your Bedrock Agent configuration:

```env
VITE_BEDROCK_AGENT_ID=your-agent-id-here
VITE_BEDROCK_AGENT_ALIAS_ID=TSTALIASID
```

To find your Agent ID:
1. Go to the [Amazon Bedrock Console](https://console.aws.amazon.com/bedrock/)
2. Navigate to "Agents" in the left sidebar
3. Find "thelexai-laws-consultant-agent" and copy its Agent ID
4. Copy the Alias ID (use `TSTALIASID` for testing or your production alias)

### 4. Configure AWS Services

#### Step 1: Set up Amazon Bedrock Agent

The application uses the `thelexai-laws-consultant-agent` Bedrock Agent. Ensure:
1. The agent is deployed and active in your AWS account
2. The agent has the necessary permissions and knowledge bases configured
3. You have the Agent ID and Alias ID ready

#### Step 2: Configure AWS Amplify Authentication

##### Option A: Use AWS Amplify Console (Recommended)

1. Go to [AWS Amplify Console](https://console.aws.amazon.com/amplify/)
2. Click "New app" → "Host web app"
3. Connect your GitHub repository
4. Add authentication through the Amplify Console UI
5. Configure IAM roles to include Bedrock Agent and Lambda permissions:
   ```json
   {
     "Version": "2012-10-17",
     "Statement": [
       {
         "Effect": "Allow",
         "Action": [
           "bedrock:InvokeAgent"
         ],
         "Resource": "arn:aws:bedrock:us-east-2:*:agent/*"
       },
       {
         "Effect": "Allow",
         "Action": [
           "lambda:InvokeFunction"
         ],
         "Resource": "arn:aws:lambda:us-east-2:*:function:s3-presigned-url"
       }
     ]
   }
   ```
   Note: The Lambda permission is automatically configured by Amplify backend when deployed, but may need manual adjustment in some scenarios.
6. Deploy the app
7. Update `amplify.config.js` with your deployed backend configuration

##### Option B: Use Amplify CLI (For local development)

1. Install Amplify CLI globally:
   ```bash
   npm install -g @aws-amplify/cli
   ```

2. Configure Amplify CLI:
   ```bash
   amplify configure
   ```

3. Initialize Amplify in your project:
   ```bash
   amplify init
   ```

4. Add authentication:
   ```bash
   amplify add auth
   ```

5. Update the IAM role for authenticated users to include Bedrock access

6. Push to AWS:
   ```bash
   amplify push
   ```

### 4. Run the development server

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build locally
- `npm run lint` - Run ESLint

## Project Structure

```
thelexaiapp/
├── public/                      # Static assets
├── src/
│   ├── components/
│   │   ├── ChatInterface.jsx   # Main chat UI component
│   │   └── ChatInterface.css   # Chat interface styles
│   ├── assets/                 # Images, fonts, etc.
│   ├── App.jsx                 # Main App with authentication wrapper
│   ├── App.css                 # App styles
│   ├── main.jsx                # Entry point with Amplify configuration
│   └── index.css               # Global styles
├── amplify.config.js           # AWS Amplify & Bedrock configuration
├── index.html                  # HTML template
├── vite.config.js              # Vite configuration
└── package.json                # Dependencies and scripts
```

## How It Works

1. **Authentication**: Users sign in through AWS Cognito using the Amplify Authenticator component
2. **Chat Interface**: A clean, responsive chat UI accepts user messages
3. **Bedrock Agent Integration**: Messages are sent to Amazon Bedrock Agent using the AWS SDK
4. **AI Response**: The Bedrock Agent generates responses with citations from the knowledge base
5. **Document References**: When the AI references documents from the knowledge base, citations are displayed with:
   - Document filename
   - Preview of the cited text
   - Download button to retrieve the full document from S3
6. **Secure Downloads**: Files are downloaded using presigned URLs generated by a Lambda function, ensuring secure and temporary access
7. **Session Management**: Amplify handles user sessions and credentials automatically

## Deployment

### Deploy to AWS Amplify Hosting

1. Push your code to GitHub
2. Go to [AWS Amplify Console](https://console.aws.amazon.com/amplify/)
3. Click "New app" → "Host web app"
4. Connect your repository and branch
5. Amplify will automatically detect the build settings
6. Ensure IAM roles have Bedrock permissions
7. Click "Save and deploy"

### Manual Build

```bash
npm run build
```

The built files will be in the `dist/` directory.

## Customization

### Change AI Model

Edit `src/components/ChatInterface.jsx` and update the `modelId`:

```javascript
const modelId = 'anthropic.claude-3-haiku-20240307-v1:0' // Faster, cheaper
// or
const modelId = 'anthropic.claude-3-opus-20240229-v1:0' // More powerful
```

### Adjust Response Length

Modify the `max_tokens` parameter in the payload:

```javascript
const payload = {
  anthropic_version: 'bedrock-2023-05-31',
  max_tokens: 2048, // Increase for longer responses
  messages: [...]
}
```

### Update AWS Region

Change the region in `src/components/ChatInterface.jsx`:

```javascript
const client = new BedrockRuntimeClient({
  region: 'us-west-2', // Your preferred region
  credentials: credentials
})
```

## Troubleshooting

### "Access Denied" Error

- Ensure your IAM role has `bedrock:InvokeModel` permissions
- Verify the Bedrock model is enabled in your AWS region
- Check that your Cognito user pool is properly configured

### Model Not Found

- Request access to the model in Amazon Bedrock console
- Wait for approval (usually instant)
- Verify the model ID matches the available models in your region

### Authentication Issues

- Double-check `amplify.config.js` has correct Cognito credentials
- Ensure user pool and app client are properly configured
- Verify email verification is working

## Learn More

- [AWS Amplify Documentation](https://docs.amplify.aws/)
- [Amazon Bedrock Documentation](https://docs.aws.amazon.com/bedrock/)
- [Claude 3 Model Documentation](https://docs.anthropic.com/claude/docs/models-overview)
- [Amplify UI React Documentation](https://ui.docs.amplify.aws/react)
- [Vite Documentation](https://vitejs.dev/)
- [React Documentation](https://react.dev/)

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.


