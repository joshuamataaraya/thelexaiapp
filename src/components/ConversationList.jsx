import { useState } from 'react'
import './ConversationList.css'

function ConversationList({ 
  conversations, 
  currentConversationId, 
  onSelectConversation, 
  onNewConversation, 
  onDeleteConversation,
  isLoading 
}) {
  const [deleteConfirmId, setDeleteConfirmId] = useState(null)

  const handleDelete = (e, conversationId) => {
    e.stopPropagation()
    if (deleteConfirmId === conversationId) {
      onDeleteConversation(conversationId)
      setDeleteConfirmId(null)
    } else {
      setDeleteConfirmId(conversationId)
      // Auto-reset confirmation after 3 seconds
      setTimeout(() => setDeleteConfirmId(null), 3000)
    }
  }

  const formatDate = (dateString) => {
    if (!dateString) return ''
    const date = new Date(dateString)
    const now = new Date()
    const diffInMs = now - date
    const diffInHours = diffInMs / (1000 * 60 * 60)
    
    if (diffInHours < 24) {
      return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
    } else if (diffInHours < 24 * 7) {
      return date.toLocaleDateString('en-US', { weekday: 'short' })
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    }
  }

  return (
    <div className="conversation-list">
      <div className="conversation-list-header">
        <h2>Conversations</h2>
        <button 
          onClick={onNewConversation} 
          className="new-conversation-button"
          disabled={isLoading}
          title="Start new conversation"
        >
          ➕ New Chat
        </button>
      </div>

      <div className="conversations-container">
        {conversations.length === 0 ? (
          <div className="no-conversations">
            <p>No conversations yet.</p>
            <p>Click "New Chat" to start!</p>
          </div>
        ) : (
          conversations.map((conversation) => (
            <div
              key={conversation.id}
              className={`conversation-item ${
                currentConversationId === conversation.id ? 'active' : ''
              }`}
              onClick={() => onSelectConversation(conversation.id)}
            >
              <div className="conversation-info">
                <div className="conversation-title">{conversation.title}</div>
                <div className="conversation-date">
                  {formatDate(conversation.lastMessageAt || conversation.createdAt)}
                </div>
              </div>
              <button
                onClick={(e) => handleDelete(e, conversation.id)}
                className={`delete-conversation-button ${
                  deleteConfirmId === conversation.id ? 'confirm-delete' : ''
                }`}
                title={
                  deleteConfirmId === conversation.id 
                    ? 'Click again to confirm' 
                    : 'Delete conversation'
                }
              >
                {deleteConfirmId === conversation.id ? '✓' : '🗑️'}
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

export default ConversationList
