import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  AlertTriangle,
  FileText,
  MessageSquare,
  Pencil,
  Plus,
  Send,
  ThumbsDown,
  ThumbsUp,
  Trash2,
} from 'lucide-react'
import {
  deleteChatSession,
  getKnowledgeItem,
  listChatMessages,
  listChatSessions,
  renameChatSession,
  sendChat,
  streamChat,
  submitFeedback,
} from '../api'
import type { ChatMessage, ChatSession, KnowledgeBase, KnowledgeItem, SourceInfo } from '../types'
import { Button, EmptyState, ErrorBanner, IconButton, Modal, Spinner } from '../ui'

function renderAnswer(
  content: string,
  citations: SourceInfo[],
  onOpenSource: (itemId: number) => void,
) {
  const parts = content.split(/(\[\d+\])/g)
  return parts.map((part, index) => {
    const match = /^\[(\d+)\]$/.exec(part)
    if (!match) {
      return <span key={index}>{part}</span>
    }
    const source = citations[Number(match[1]) - 1]
    if (!source) {
      return <span key={index}>{part}</span>
    }
    return (
      <button
        key={index}
        type="button"
        className="citation-marker"
        title={source.itemTitle || `来源 #${source.itemId}`}
        onClick={() => onOpenSource(source.itemId)}
      >
        {match[1]}
      </button>
    )
  })
}

function MessageBubble({
  message,
  feedback,
  onOpenSource,
  onFeedback,
}: {
  message: ChatMessage
  feedback: string
  onOpenSource: (itemId: number) => void
  onFeedback: (messageId: number, rating: string) => void
}) {
  const sources = useMemo(() => {
    if (!message.sources) return []
    try {
      return JSON.parse(message.sources) as SourceInfo[]
    } catch {
      return []
    }
  }, [message.sources])

  const citations = useMemo(() => {
    if (!message.citations) return []
    try {
      return JSON.parse(message.citations) as SourceInfo[]
    } catch {
      return []
    }
  }, [message.citations])

  return (
    <div className={`bubble ${message.role}`}>
      <div className="bubble-meta">{message.role === 'assistant' ? 'AI 助手' : '我'}</div>
      <div className="bubble-content">
        {message.role === 'assistant'
          ? renderAnswer(message.content, citations, onOpenSource)
          : message.content}
      </div>
      {sources.length > 0 && (
        <details className="sources">
          <summary>
            <FileText size={14} />
            引用来源 ({sources.length})
          </summary>
          <div className="source-list">
            {sources.map((source, index) => (
              <button
                key={`${source.chunkId ?? source.itemId}-${index}`}
                type="button"
                className="source-item source-item-button"
                onClick={() => onOpenSource(source.itemId)}
              >
                <div className="source-head">
                  <strong>{source.itemTitle || `条目 #${source.itemId}`}</strong>
                  <span className="source-type">{source.itemType === 'DOCUMENT' ? '文档' : '题目'}</span>
                  <span>{Math.round(source.score * 100)}%</span>
                </div>
                <p>{source.content}</p>
              </button>
            ))}
          </div>
        </details>
      )}
      {citations.length > 0 && (
        <details className="sources citations">
          <summary>
            <FileText size={14} />
            答案引用 ({citations.length})
          </summary>
          <div className="source-list">
            {citations.map((source, index) => (
              <button
                key={`citation-${source.chunkId ?? source.itemId}-${index}`}
                type="button"
                className="source-item source-item-button"
                onClick={() => onOpenSource(source.itemId)}
              >
                <div className="source-head">
                  <strong>{source.itemTitle || `条目 #${source.itemId}`}</strong>
                  <span className="source-type">{source.itemType === 'DOCUMENT' ? '文档' : '题目'}</span>
                  <span>{Math.round(source.score * 100)}%</span>
                </div>
                <p>{source.content}</p>
              </button>
            ))}
          </div>
        </details>
      )}
      {message.role === 'assistant' && (
        <div className="feedback-row">
          {(['LIKE', 'DISLIKE', 'CORRECTION'] as const).map((rating) => (
            <button
              key={rating}
              type="button"
              className={`feedback-btn ${feedback === rating ? 'active' : ''}`}
              disabled={feedback !== ''}
              onClick={() => onFeedback(message.id, rating)}
            >
              {rating === 'LIKE' ? (
                <ThumbsUp size={13} />
              ) : rating === 'DISLIKE' ? (
                <ThumbsDown size={13} />
              ) : (
                <AlertTriangle size={13} />
              )}
              <span>{rating === 'LIKE' ? '有帮助' : rating === 'DISLIKE' ? '不准确' : '纠错'}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default function ChatView({ knowledgeBase }: { knowledgeBase: KnowledgeBase }) {
  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [activeSessionId, setActiveSessionId] = useState<number | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [streamingAnswer, setStreamingAnswer] = useState('')
  const [loadingSessions, setLoadingSessions] = useState(true)
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sourceOpen, setSourceOpen] = useState(false)
  const [loadingSource, setLoadingSource] = useState(false)
  const [sourceItem, setSourceItem] = useState<KnowledgeItem | null>(null)
  const [renameTarget, setRenameTarget] = useState<ChatSession | null>(null)
  const [renameTitle, setRenameTitle] = useState('')
  const [sessionToDelete, setSessionToDelete] = useState<ChatSession | null>(null)
  const threadRef = useRef<HTMLDivElement>(null)
  const sourcesRef = useRef<SourceInfo[]>([])
  const citationsRef = useRef<SourceInfo[]>([])
  const [feedback, setFeedback] = useState<Record<number, string>>({})

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
  }, [messages, sending, streamingAnswer])

  const startNewChat = () => {
    setActiveSessionId(null)
    setMessages([])
    setStreamingAnswer('')
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

  const openSource = async (itemId: number) => {
    setSourceOpen(true)
    setLoadingSource(true)
    setSourceItem(null)
    try {
      const item = await getKnowledgeItem(itemId)
      setSourceItem(item)
    } catch (e) {
      setError(e instanceof Error ? e.message : '加载来源失败')
    } finally {
      setLoadingSource(false)
    }
  }

  const handleRename = async () => {
    if (!renameTarget || !renameTitle.trim()) return
    try {
      await renameChatSession(renameTarget.id, renameTitle.trim())
      setRenameTarget(null)
      await loadSessions()
    } catch (e) {
      setError(e instanceof Error ? e.message : '重命名失败')
    }
  }

  const handleDeleteSession = async () => {
    if (!sessionToDelete) return
    try {
      await deleteChatSession(sessionToDelete.id)
      if (activeSessionId === sessionToDelete.id) {
        startNewChat()
      }
      setSessionToDelete(null)
      await loadSessions()
    } catch (e) {
      setError(e instanceof Error ? e.message : '删除会话失败')
      setSessionToDelete(null)
    }
  }

  const handleFeedback = async (messageId: number, rating: string) => {
    try {
      await submitFeedback(messageId, rating)
      setFeedback((prev) => ({ ...prev, [messageId]: rating }))
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : '反馈提交失败')
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
      citations: null,
      createdAt: new Date().toISOString(),
    }
    setMessages((prev) => [...prev, userMessage])
    setInput('')
    setSending(true)
    setStreamingAnswer('')
    setError(null)
    sourcesRef.current = []
    citationsRef.current = []
    const payload = {
      knowledgeBaseId: knowledgeBase.id,
      message: text,
      sessionId: activeSessionId,
    }
    try {
      await streamChat(payload, {
        onMeta: (sessionId) => setActiveSessionId(sessionId),
        onDelta: (content) => setStreamingAnswer((prev) => prev + content),
        onSources: (sources) => {
          sourcesRef.current = sources
        },
        onCitations: (citations) => {
          citationsRef.current = citations
        },
        onDone: (sessionId, answer) => {
          setActiveSessionId(sessionId)
          setMessages((prev) => [
            ...prev,
            {
              id: Date.now() + 1,
              sessionId,
              role: 'assistant',
              content: answer,
              sources: JSON.stringify(sourcesRef.current),
              citations: JSON.stringify(citationsRef.current),
              createdAt: new Date().toISOString(),
            },
          ])
        },
      })
      await loadSessions()
    } catch (streamError) {
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
            citations: JSON.stringify(result.citations),
            createdAt: new Date().toISOString(),
          },
        ])
        await loadSessions()
      } catch (fallbackError) {
        setError(fallbackError instanceof Error ? fallbackError.message : '发送失败')
      }
    } finally {
      setSending(false)
      setStreamingAnswer('')
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
            <div key={session.id} className={`session-item ${activeSessionId === session.id ? 'active' : ''}`}>
              <button type="button" className="session-item-main" onClick={() => void selectSession(session.id)}>
                <strong>{session.title || `会话 ${session.id}`}</strong>
                <span>{new Date(session.updatedAt).toLocaleString('zh-CN')}</span>
              </button>
              <div className="session-item-actions">
                <IconButton label="重命名会话" onClick={() => {
                  setRenameTarget(session)
                  setRenameTitle(session.title ?? '')
                }}>
                  <Pencil size={14} />
                </IconButton>
                <IconButton label="删除会话" onClick={() => setSessionToDelete(session)}>
                  <Trash2 size={14} />
                </IconButton>
              </div>
            </div>
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
            <MessageBubble
              key={message.id}
              message={message}
              feedback={feedback[message.id] ?? ''}
              onFeedback={(messageId, rating) => void handleFeedback(messageId, rating)}
              onOpenSource={(itemId) => void openSource(itemId)}
            />
          ))}
          {sending && (
            <div className="bubble assistant typing">
              <Spinner size={16} />
              <span>{streamingAnswer || '正在查找资料并生成回答...'}</span>
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

      {renameTarget && (
        <Modal title="重命名会话" onClose={() => setRenameTarget(null)}>
          <div className="form">
            <label>
              会话名称
              <input
                autoFocus
                value={renameTitle}
                onChange={(e) => setRenameTitle(e.target.value)}
                placeholder="输入会话名称"
              />
            </label>
            <div className="modal-actions">
              <Button onClick={() => setRenameTarget(null)}>取消</Button>
              <Button variant="primary" disabled={!renameTitle.trim()} onClick={() => void handleRename()}>
                保存
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {sessionToDelete && (
        <Modal title="删除会话" onClose={() => setSessionToDelete(null)}>
          <p className="modal-copy">删除“{sessionToDelete.title || `会话 ${sessionToDelete.id}`}”会同时删除其中的消息，且无法恢复。</p>
          <div className="modal-actions">
            <Button onClick={() => setSessionToDelete(null)}>取消</Button>
            <Button variant="danger" onClick={() => void handleDeleteSession()}>
              <Trash2 size={16} />
              删除
            </Button>
          </div>
        </Modal>
      )}

      {sourceOpen && (
        <Modal title="来源详情" onClose={() => {
          setSourceOpen(false)
          setSourceItem(null)
        }}>
          {loadingSource || !sourceItem ? (
            <div className="modal-loading">
              <Spinner size={20} />
            </div>
          ) : (
            <div className="source-detail">
              <h3>{sourceItem.title}</h3>
              <div className="source-detail-meta">
                <span>{sourceItem.itemType === 'DOCUMENT' ? '文档' : '题目'}</span>
                {sourceItem.category && <span>{sourceItem.category}</span>}
                {sourceItem.source && <span>{sourceItem.source}</span>}
              </div>
              <p className="source-detail-content">{sourceItem.content}</p>
            </div>
          )}
        </Modal>
      )}
    </div>
  )
}
