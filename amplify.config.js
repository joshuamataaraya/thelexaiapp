// AWS Amplify Configuration
// This file contains the configuration for AWS Amplify services
// Update these values with your AWS Amplify project details after deployment

const amplifyConfig = {
  Auth: {
    Cognito: {
      userPoolId: 'us-east-2_3iUhgFt9X', // Replace with your User Pool ID
      userPoolClientId: '1g6np620nqrelpg31jlm0j3mkq', // Replace with your App Client ID
      region: 'us-east-2', // Replace with your AWS region
      loginWith: {
        email: true,
      },
      signUpVerificationMethod: 'code',
      userAttributes: {
        email: {
          required: true,
        },
      },
      allowGuestAccess: true,
      passwordFormat: {
        minLength: 8,
        requireLowercase: true,
        requireUppercase: true,
        requireNumbers: true,
        requireSpecialCharacters: true,
      },
    },
  },
};

// Amazon Bedrock Configuration
// The chatbot uses Amazon Bedrock for AI responses
// Supported models:
// - anthropic.claude-3-sonnet-20240229-v1:0 (default)
// - anthropic.claude-3-haiku-20240307-v1:0
// - anthropic.claude-3-opus-20240229-v1:0
// Make sure to enable the desired model in your AWS Bedrock console
// and ensure your IAM role has bedrock:InvokeModel permissions

export default amplifyConfig;

