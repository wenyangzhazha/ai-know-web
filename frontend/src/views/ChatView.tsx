import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { FileText, MessageSquare, Plus, Send } from 'lucide-react'
import { listChatMessages, listChatSessions, sendChat } from '../api'
import type { ChatMessage, ChatSession, KnowledgeBase, SourceInfo } from '../types'
import { Button, EmptyState, ErrorBanner, IconButton, Spinner } from '../ui'

function MessageBubble({ message }: { message: ChatMessage }) {
  const sources = useMemo(() => {
    if (!message.sources) return []
    try {
      return JSON.parse(message.sources) as SourceInfo[]
    } catch {
      return []
    }
  }, [message.sources])

  return (
    <div className={`bubble ${message.role}`}>
      <div className="bubble-meta">{message.role === 'assistant' ? 'AI 助手' : '我'}</div>
      <div className="bubble-content">{message.content}</div>
      {sources.length > 0 && (
        <details className="sources">
          <summary>
            <FileText size={14} />
            引用来源 ({sources.length})
          </summary>
          <div className="source-list">
            {sources.map((source, index) => (
              <div key={index} className="source-item">
                <div className="source-head">
                  <strong>{source.documentTitle || `文档 #${source.documentId}`}</strong>
                  <span>{Math.round(source.score * 100)}%</span>
                </div>
                <p>{source.content}</p>
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  )
}

/******1111111111111111111111111111 */

export default function ChatView({ knowledgeBase }: { knowledgeBase: KnowledgeBase }) {
  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [activeSessionId, setActiveSessionId] = useState<number | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [loadingSessions, setLoadingSessions] = useState(true)
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const threadRef = useRef<HTMLDivElement>(null)
  
  const loadSessions = useCallback(async () => {
    try {
      const data = await listChatSessions(knowledgeBase.id)
      setSessions(data)
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : '加载会话失败')
    } finally {
      setLoadingSessions(false)
    }
  }, [knowledgeBase.id])

  useEffect(() => {
    void loadSessions()
  }, [loadSessions])

  useEffect(() => {
    threadRef.current?.scrollTo({ top: threadRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, sending])

  const startNewChat = () => {
    setActiveSessionId(null)
    setMessages([])
    setError(null)
  }

  const selectSession = async (sessionId: number) => {
    setActiveSessionId(sessionId)
    setMessages([])
    setLoadingMessages(true)
    setError(null)
    try {
      const data = await listChatMessages(sessionId)
      setMessages(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : '加载消息失败')
    } finally {
      setLoadingMessages(false)
    }
  }

  const handleSend = async () => {
    const text = input.trim()
    if (!text || sending) return
    const userMessage: ChatMessage = {
      id: Date.now(),
      sessionId: activeSessionId ?? 0,
      role: 'user',
      content: text,
      sources: null,
      createdAt: new Date().toISOString(),
    }
    setMessages((prev) => [...prev, userMessage])
    setInput('')
    setSending(true)
    setError(null)
    try {
      const result = await sendChat({
        knowledgeBaseId: knowledgeBase.id,
        message: text,
        sessionId: activeSessionId,
      })
      setActiveSessionId(result.sessionId)
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          sessionId: result.sessionId,
          role: 'assistant',
          content: result.answer,
          sources: JSON.stringify(result.sources),
          createdAt: new Date().toISOString(),
        },
      ])
      await loadSessions()
    } catch (e) {
      setError(e instanceof Error ? e.message : '发送失败')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="chat-layout">
      <aside className="session-rail">
        <div className="session-rail-head">
          <span>历史会话</span>
          <Button size="sm" onClick={startNewChat}>
            <Plus size={14} />
            新对话
          </Button>
        </div>
        <div className="session-list">
          {sessions.map((session) => (
            <button
              key={session.id}
              type="button"
              className={`session-item ${activeSessionId === session.id ? 'active' : ''}`}
              onClick={() => void selectSession(session.id)}
            >
              <strong>{session.title || `会话 ${session.id}`}</strong>
              <span>{new Date(session.updatedAt).toLocaleString('zh-CN')}</span>
            </button>
          ))}
          {!loadingSessions && sessions.length === 0 && <p className="muted">暂无会话</p>}
        </div>
      </aside>

      <section className="thread">
        <div className="thread-head">
          <select
            value={activeSessionId ?? ''}
            onChange={(e) => {
              const value = e.target.value
              if (value) void selectSession(Number(value))
              else startNewChat()
            }}
          >
            <option value="">新对话</option>
            {sessions.map((session) => (
              <option key={session.id} value={session.id}>
                {session.title || `会话 ${session.id}`}
              </option>
            ))}
          </select>
          <Button size="sm" onClick={startNewChat}>
            <Plus size={14} />
            新对话
          </Button>
        </div>

        <div className="thread-body" ref={threadRef}>
          {messages.length === 0 && !loadingMessages && (
            <EmptyState
              icon={<MessageSquare size={28} />}
              title={activeSessionId ? '这个会话还没有消息' : '开始新对话'}
              description="输入问题后，回答和引用来源会显示在这里。"
            />
          )}
          {loadingMessages && (
            <div className="thread-loading">
              <Spinner size={20} />
            </div>
          )}
          {messages.map((message) => (
            <MessageBubble key={message.id} message={message} />
          ))}
          {sending && (
            <div className="bubble assistant typing">
              <Spinner size={16} />
              <span>正在查找资料并生成回答...</span>
            </div>
          )}
        </div>

        <div className="composer">
          {error && <ErrorBanner message={error} onDismiss={() => setError(null)} />}
          <div className="composer-box">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  void handleSend()
                }
              }}
              placeholder="输入问题，Enter 发送"
              rows={1}
            />
            <IconButton
              label="发送"
              className="send-btn"
              onClick={() => void handleSend()}
              disabled={!input.trim() || sending}
            >
              <Send size={18} />
            </IconButton>
          </div>
        </div>
      </section>
    </div>
  )
}
