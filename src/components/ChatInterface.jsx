import { useState, useRef, useEffect } from 'react'
import { BedrockAgentRuntimeClient, InvokeAgentCommand } from '@aws-sdk/client-bedrock-agent-runtime'
import { fetchAuthSession } from 'aws-amplify/auth'
import './ChatInterface.css'

function ChatInterface({ user, signOut }) {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [sessionId, setSessionId] = useState(null)
  const messagesEndRef = useRef(null)
  
  // Bedrock Agent configuration
  const AGENT_NAME = 'thelexai-laws-consultant-agent'
  const AGENT_ALIAS_ID = import.meta.env.VITE_BEDROCK_AGENT_ALIAS_ID || 'TSTALIASID' // Use test alias by default

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const sendMessage = async (e) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return

    const userMessage = { role: 'user', content: input }
    const updatedMessages = [...messages, userMessage]
    setMessages(updatedMessages)
    setInput('')
    setIsLoading(true)

    try {
      // Get AWS credentials from Amplify
      const session = await fetchAuthSession()
      console.log('Auth session from Amplify:', session)

      const { credentials } = session

      if (!credentials || !credentials.accessKeyId) {
        throw new Error('No AWS credentials found in Amplify Auth session')
      }

      // Initialize Bedrock Agent Runtime client with user's temporary credentials
      const client = new BedrockAgentRuntimeClient({
        region: 'us-east-2',
        credentials: {
          accessKeyId: credentials.accessKeyId,
          secretAccessKey: credentials.secretAccessKey,
          sessionToken: credentials.sessionToken,
        },
      })

      // Generate a new session ID if we don't have one
      const currentSessionId = sessionId || `session-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
      if (!sessionId) {
        setSessionId(currentSessionId)
      }

      // Get the agent ID by listing agents (in production, you'd store this)
      // For now, we'll need to provide the agent ID directly
      // You should replace this with your actual agent ID
      const AGENT_ID = import.meta.env.VITE_BEDROCK_AGENT_ID || 'EL6UCVXXJB'

      // Invoke the Bedrock Agent
      const command = new InvokeAgentCommand({
        agentId: AGENT_ID,
        agentAliasId: AGENT_ALIAS_ID,
        sessionId: currentSessionId,
        inputText: input,
      })

      const response = await client.send(command)
      
      // Process the streaming response
      let assistantText = ''
      
      if (response.completion) {
        for await (const event of response.completion) {
          if (event.chunk) {
            const chunk = event.chunk
            if (chunk.bytes) {
              const decodedChunk = new TextDecoder().decode(chunk.bytes)
              assistantText += decodedChunk
            }
          }
        }
      }

      const assistantMessage = {
        role: 'assistant',
        content: assistantText || 'No response received from agent.',
      }

      setMessages((prev) => [...prev, assistantMessage])
    } catch (error) {
      console.error('Error calling Bedrock Agent:', error)
      const errorMessage = {
        role: 'assistant',
        content: `Error: ${error.message}. Make sure your AWS credentials have access to Amazon Bedrock Agents and the agent is properly configured.`
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="chat-container">
      <div className="chat-header">
        <div>
          <h1>TheLex AI Chat</h1>
          <p className="user-info">Powered by Amazon Bedrock Agent ({AGENT_NAME}) • Logged in as {user?.username}</p>
        </div>
        <button onClick={signOut} className="sign-out-button">
          Sign Out
        </button>
      </div>
      
      <div className="chat-messages">
        {messages.length === 0 && (
          <div className="welcome-message">
            <h2>Welcome to TheLex AI Legal Consultant! 👋</h2>
            <p>Ask me about legal matters and I'll assist you using the {AGENT_NAME} powered by Amazon Bedrock.</p>
          </div>
        )}
        
        {messages.map((message, index) => (
          <div
            key={index}
            className={`message ${message.role === 'user' ? 'user-message' : 'assistant-message'}`}
          >
            <div className="message-content">
              <strong>{message.role === 'user' ? 'You' : 'AI'}:</strong>
              <p>{message.content}</p>
            </div>
          </div>
        ))}
        
        {isLoading && (
          <div className="message assistant-message">
            <div className="message-content">
              <strong>AI:</strong>
              <p className="typing-indicator">Thinking...</p>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>
      
      <form onSubmit={sendMessage} className="chat-input-form">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type your message here..."
          className="chat-input"
          disabled={isLoading}
        />
        <button 
          type="submit" 
          className="send-button"
          disabled={isLoading || !input.trim()}
        >
          Send
        </button>
      </form>
    </div>
  )
}

export default ChatInterface
