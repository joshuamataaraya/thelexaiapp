import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Amplify } from 'aws-amplify'
import amplifyConfig from '../amplify.config.js'
import './index.css'
import App from './App.jsx'

// Configure Amplify
Amplify.configure(amplifyConfig)

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
