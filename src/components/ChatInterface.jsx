import { useState, useRef, useEffect } from 'react'
import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime'
import { fetchAuthSession } from 'aws-amplify/auth'
import './ChatInterface.css'

function ChatInterface({ user, signOut }) {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef(null)

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
      const { credentials } = await fetchAuthSession()
      
      // Initialize Bedrock client with user's credentials
      const client = new BedrockRuntimeClient({
        region: 'us-east-1', // Update with your preferred region
        credentials: credentials
      })

      // Prepare the request for Claude 3 Sonnet with full conversation history
      const modelId = 'anthropic.claude-3-sonnet-20240229-v1:0'
      const payload = {
        anthropic_version: 'bedrock-2023-05-31',
        max_tokens: 1024,
        messages: updatedMessages.map(msg => ({
          role: msg.role,
          content: msg.content
        }))
      }

      const command = new InvokeModelCommand({
        modelId: modelId,
        contentType: 'application/json',
        accept: 'application/json',
        body: JSON.stringify(payload)
      })

      const response = await client.send(command)
      const responseBody = JSON.parse(new TextDecoder().decode(response.body))
      
      const assistantMessage = {
        role: 'assistant',
        content: responseBody.content[0].text
      }
      
      setMessages(prev => [...prev, assistantMessage])
    } catch (error) {
      console.error('Error calling Bedrock:', error)
      const errorMessage = {
        role: 'assistant',
        content: `Error: ${error.message}. Make sure your AWS credentials have access to Amazon Bedrock and the model is enabled in your region.`
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
          <p className="user-info">Powered by Amazon Bedrock • Logged in as {user?.username}</p>
        </div>
        <button onClick={signOut} className="sign-out-button">
          Sign Out
        </button>
      </div>
      
      <div className="chat-messages">
        {messages.length === 0 && (
          <div className="welcome-message">
            <h2>Welcome to TheLex AI Chat! 👋</h2>
            <p>Ask me anything and I'll respond using Amazon Bedrock's AI models.</p>
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
