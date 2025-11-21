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

      // Get AWS credentials from Amplify
      const session = await fetchAuthSession()
      console.log('Auth session from Amplify:', session)

      const { credentials } = session

      if (!credentials || !credentials.accessKeyId) {
        throw new Error('No AWS credentials found in Amplify Auth session')
      }

      // Initialize Bedrock client with user's temporary credentials
      const client = new BedrockRuntimeClient({
        region: 'us-east-2',
        credentials: {
          accessKeyId: credentials.accessKeyId,
          secretAccessKey: credentials.secretAccessKey,
          sessionToken: credentials.sessionToken,
        },
      })

      // Prepare the request for Claude 3 Sonnet with full conversation history
      const modelId = 'arn:aws:bedrock:us-east-2:164829817550:inference-profile/us.meta.llama4-scout-17b-instruct-v1:0'
      const conversationText = updatedMessages
        .map((m) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
        .join('\n')

      const payload = {
        // This is what Llama is asking for
        prompt: `${conversationText}\nAssistant:`,
        max_gen_len: 512,      // equivalent idea to max_tokens
        temperature: 0.7,
        top_p: 0.9,
      }

      const command = new InvokeModelCommand({
        modelId,
        contentType: 'application/json',
        accept: 'application/json',
        body: JSON.stringify(payload),
      })

      const response = await client.send(command)
      const rawBody = new TextDecoder().decode(response.body)
      console.log('Bedrock raw response:', rawBody)

      const responseBody = JSON.parse(rawBody)

      // Llama response format
      const assistantText =
        responseBody.generation ||
        responseBody.output_text || // just in case format changes
        JSON.stringify(responseBody)

      const assistantMessage = {
        role: 'assistant',
        content: assistantText,
      }

      setMessages((prev) => [...prev, assistantMessage])
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
