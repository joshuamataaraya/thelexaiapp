import { useState, useRef, useEffect } from 'react'
import { BedrockAgentRuntimeClient, InvokeAgentCommand } from '@aws-sdk/client-bedrock-agent-runtime'
import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda'
import { fetchAuthSession } from 'aws-amplify/auth'
import './ChatInterface.css'

function ChatInterface({ user, signOut }) {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [sessionId, setSessionId] = useState(null)
  const [downloadingFiles, setDownloadingFiles] = useState(new Set())
  const messagesEndRef = useRef(null)
  
  // Bedrock Agent configuration
  const AGENT_NAME = 'thelexai-laws-consultant-agent'
  const AGENT_ALIAS_ID = import.meta.env.VITE_BEDROCK_AGENT_ALIAS_ID || 'TSTALIASID' // Use test alias by default
  const AWS_REGION = import.meta.env.VITE_AWS_REGION || 'us-east-2'
  const CITATION_PREVIEW_LENGTH = 150

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const downloadFile = async (s3Uri, fileName) => {
    setDownloadingFiles(prev => new Set(prev).add(s3Uri))
    
    // AWS region configuration
    const AWS_REGION = import.meta.env.VITE_AWS_REGION || 'us-east-2'
    
    try {
      const session = await fetchAuthSession()
      const { credentials } = session

      if (!credentials || !credentials.accessKeyId) {
        throw new Error('No AWS credentials found')
      }

      // Initialize Lambda client with user's credentials
      const lambdaClient = new LambdaClient({
        region: AWS_REGION,
        credentials: {
          accessKeyId: credentials.accessKeyId,
          secretAccessKey: credentials.secretAccessKey,
          sessionToken: credentials.sessionToken,
        },
      })

      // Call the Lambda function to get presigned URL
      const invokeCommand = new InvokeCommand({
        FunctionName: 's3-presigned-url',
        Payload: JSON.stringify({ s3Uri }),
      })

      const lambdaResponse = await lambdaClient.send(invokeCommand)
      const responsePayload = JSON.parse(new TextDecoder().decode(lambdaResponse.Payload))
      
      if (responsePayload.statusCode !== 200) {
        const errorBody = JSON.parse(responsePayload.body)
        throw new Error(errorBody.error || 'Failed to get presigned URL')
      }

      const { presignedUrl } = JSON.parse(responsePayload.body)

      // Download the file using the presigned URL
      const fileResponse = await fetch(presignedUrl)
      if (!fileResponse.ok) {
        throw new Error('Failed to download file')
      }

      const blob = await fileResponse.blob()
      const url = window.URL.createObjectURL(blob)
      let downloadLink = null
      
      try {
        downloadLink = document.createElement('a')
        downloadLink.href = url
        downloadLink.download = fileName || s3Uri.split('/').pop()
        document.body.appendChild(downloadLink)
        downloadLink.click()
      } finally {
        // Ensure cleanup happens even if click fails
        window.URL.revokeObjectURL(url)
        if (downloadLink && downloadLink.parentNode) {
          document.body.removeChild(downloadLink)
        }
      }
    } catch (error) {
      console.error('Error downloading file:', error)
      alert(`Failed to download file: ${error.message}`)
    } finally {
      setDownloadingFiles(prev => {
        const next = new Set(prev)
        next.delete(s3Uri)
        return next
      })
    }
  }

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
        region: AWS_REGION,
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
      const citations = []
      
      if (response.completion) {
        for await (const event of response.completion) {
          // Handle text chunks
          if (event.chunk) {
            const chunk = event.chunk
            if (chunk.bytes) {
              const decodedChunk = new TextDecoder().decode(chunk.bytes)
              assistantText += decodedChunk
            }
          }
          
          // Handle citation events
          if (event.citation) {
            console.log('Citation event received:', event.citation)
            if (event.citation.retrievedReferences) {
              citations.push(...event.citation.retrievedReferences)
            }
          }
        }
      }

      const assistantMessage = {
        role: 'assistant',
        content: assistantText || 'No response received from agent.',
        citations: citations.length > 0 ? citations : undefined,
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
              
              {/* Display citations and file downloads for assistant messages */}
              {message.role === 'assistant' && message.citations && message.citations.length > 0 && (
                <div className="citations">
                  <div className="citations-header">
                    <span className="citations-icon">📚</span>
                    <strong>Referenced Documents ({message.citations.length})</strong>
                  </div>
                  <div className="citations-list">
                    {message.citations.map((citation, citationIndex) => {
                      const location = citation.location
                      const s3Location = location?.s3Location
                      const s3Uri = s3Location?.uri
                      
                      if (!s3Uri) return null
                      
                      // Extract filename from S3 URI
                      const fileName = s3Uri.split('/').pop() || 'document.pdf'
                      const isDownloading = downloadingFiles.has(s3Uri)
                      
                      // Get content preview if available
                      const contentText = citation.content?.text
                      
                      return (
                        <div key={citationIndex} className="citation-item">
                          <div className="citation-info">
                            <span className="file-icon">📄</span>
                            <div className="citation-details">
                              <div className="citation-filename">{fileName}</div>
                              {contentText && (
                                <div className="citation-preview">
                                  {contentText.length > CITATION_PREVIEW_LENGTH 
                                    ? `${contentText.substring(0, CITATION_PREVIEW_LENGTH)}...` 
                                    : contentText}
                                </div>
                              )}
                            </div>
                          </div>
                          <button
                            onClick={() => downloadFile(s3Uri, fileName)}
                            className="download-button"
                            disabled={isDownloading}
                            title="Download document"
                          >
                            {isDownloading ? (
                              <span className="download-spinner">⏳</span>
                            ) : (
                              <span className="download-icon">⬇️</span>
                            )}
                            {isDownloading ? 'Downloading...' : 'Download'}
                          </button>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
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
