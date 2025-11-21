# Setting Up the Bedrock Agent

## Quick Setup

1. **Get your Bedrock Agent ID:**
   - Open the [AWS Bedrock Console](https://console.aws.amazon.com/bedrock/)
   - Navigate to **Agents** in the sidebar
   - Find the agent named **thelexai-laws-consultant-agent**
   - Copy the Agent ID (format: `ABCDEFGHIJ`)

2. **Create environment file:**
   ```bash
   cp .env.example .env
   ```

3. **Update the .env file:**
   ```env
   VITE_BEDROCK_AGENT_ID=your-copied-agent-id-here
   VITE_BEDROCK_AGENT_ALIAS_ID=TSTALIASID
   ```

4. **Restart the development server:**
   ```bash
   npm run dev
   ```

## IAM Permissions Required

The authenticated user's IAM role must have the following permissions:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "bedrock:InvokeAgent"
      ],
      "Resource": [
        "arn:aws:bedrock:us-east-2:*:agent/*",
        "arn:aws:bedrock:us-east-2:*:agent-alias/*"
      ]
    }
  ]
}
```

## Troubleshooting

### Error: "YOUR_AGENT_ID_HERE"
- You haven't set the `VITE_BEDROCK_AGENT_ID` in your `.env` file
- Make sure the `.env` file is in the root directory
- Restart your dev server after creating/updating `.env`

### Error: "Access Denied"
- Check that your Cognito Identity Pool's authenticated role has `bedrock:InvokeAgent` permission
- Verify the agent exists in the `us-east-2` region
- Ensure the agent alias ID is correct

### Session Management
- Each conversation maintains a session ID
- Sessions persist across messages in the same chat
- Refresh the page to start a new session
