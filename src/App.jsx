import { Authenticator } from '@aws-amplify/ui-react'
import '@aws-amplify/ui-react/styles.css'
import ChatInterface from './components/ChatInterface'
import './App.css'

function App() {
  return (
    <Authenticator>
      {({ signOut, user }) => (
        <ChatInterface user={user} signOut={signOut} />
      )}
    </Authenticator>
  )
}

export default App
