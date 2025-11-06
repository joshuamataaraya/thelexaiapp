// AWS Amplify Configuration
// This file contains the configuration for AWS Amplify services
// Update these values with your AWS Amplify project details after deployment

const amplifyConfig = {
  Auth: {
    Cognito: {
      userPoolId: 'us-east-1_XXXXXXXXX', // Replace with your User Pool ID
      userPoolClientId: 'XXXXXXXXXXXXXXXXXXXXXXXXXX', // Replace with your App Client ID
      region: 'us-east-1', // Replace with your AWS region
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

export default amplifyConfig;
