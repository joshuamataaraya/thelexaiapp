# thelexaiapp

AWS Amplify + React + Vite starter project with authentication.

## Features

- ⚡️ Vite for fast development and building
- ⚛️ React 19 for building user interfaces
- 🔐 AWS Amplify authentication with UI components
- 🎨 Pre-configured ESLint for code quality
- 📦 Ready for AWS Amplify deployment

## Prerequisites

- Node.js 18+ and npm
- AWS Account (for deploying Amplify backend)
- AWS Amplify CLI (optional, for local backend development)

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

### 3. Configure AWS Amplify

#### Option A: Use AWS Amplify Console (Recommended for beginners)

1. Go to [AWS Amplify Console](https://console.aws.amazon.com/amplify/)
2. Click "New app" → "Host web app"
3. Connect your GitHub repository
4. Add authentication through the Amplify Console UI
5. Deploy the app
6. Update `amplify.config.js` with your deployed backend configuration

#### Option B: Use Amplify CLI (For local development)

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
   Choose default configuration or customize as needed.

5. Push to AWS:
   ```bash
   amplify push
   ```

6. The CLI will automatically generate the configuration file.

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
├── public/              # Static assets
├── src/
│   ├── assets/         # Images, fonts, etc.
│   ├── App.jsx         # Main App component with Authenticator
│   ├── App.css         # App styles
│   ├── main.jsx        # Entry point with Amplify configuration
│   └── index.css       # Global styles
├── amplify.config.js   # AWS Amplify configuration
├── index.html          # HTML template
├── vite.config.js      # Vite configuration
└── package.json        # Dependencies and scripts
```

## Deployment

### Deploy to AWS Amplify Hosting

1. Push your code to GitHub
2. Go to [AWS Amplify Console](https://console.aws.amazon.com/amplify/)
3. Click "New app" → "Host web app"
4. Connect your repository and branch
5. Amplify will automatically detect the build settings
6. Click "Save and deploy"

### Manual Build

```bash
npm run build
```

The built files will be in the `dist/` directory.

## Customization

### Update Amplify Configuration

Edit `amplify.config.js` to update your AWS Amplify backend settings after deployment.

### Customize Authentication UI

The Authenticator component from `@aws-amplify/ui-react` can be customized. See the [official documentation](https://ui.docs.amplify.aws/) for more options.

## Learn More

- [AWS Amplify Documentation](https://docs.amplify.aws/)
- [Amplify UI React Documentation](https://ui.docs.amplify.aws/react)
- [Vite Documentation](https://vitejs.dev/)
- [React Documentation](https://react.dev/)

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

