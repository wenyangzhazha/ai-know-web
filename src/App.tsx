import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  BookOpen,
  Database,
  FileText,
  FolderPlus,
  ListChecks,
  Menu,
  MessageSquare,
  Plus,
  Trash2,
} from 'lucide-react'
import { createKnowledgeBase, deleteKnowledgeBase, listKnowledgeBases } from './api'
import type { KnowledgeBase } from './types'
import { Button, EmptyState, ErrorBanner, IconButton, Modal, Spinner } from './ui'
import DocumentsView from './views/DocumentsView'
import QuestionsView from './views/QuestionsView'
import ChatView from './views/ChatView'

export default function App() {
  const [knowledgeBases, setKnowledgeBases] = useState<KnowledgeBase[]>([])
  const [activeKbId, setActiveKbId] = useState<number | null>(null)
  const [view, setView] = useState<'documents' | 'questions' | 'chat'>('documents')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [kbModalOpen, setKbModalOpen] = useState(false)
  const [kbToDelete, setKbToDelete] = useState<KnowledgeBase | null>(null)
  const [kbName, setKbName] = useState('')
  const [kbDescription, setKbDescription] = useState('')
  const [formError, setFormError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const loadKnowledgeBases = useCallback(async () => {
    try {
      const data = await listKnowledgeBases()
      setKnowledgeBases(data)
      setError(null)
      setActiveKbId((current) => {
        if (current && data.some((kb) => kb.id === current)) return current
        return data[0]?.id ?? null
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : '加载知识库失败')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadKnowledgeBases()
  }, [loadKnowledgeBases])

  const activeKb = useMemo(
    () => knowledgeBases.find((kb) => kb.id === activeKbId) ?? null,
    [knowledgeBases, activeKbId],
  )

  const openCreateModal = () => {
    setFormError(null)
    setKbName('')
    setKbDescription('')
    setKbModalOpen(true)
  }

  const handleCreate = async () => {
    const name = kbName.trim()
    if (!name) return
    setSaving(true)
    setFormError(null)
    try {
      const kb = await createKnowledgeBase({ name, description: kbDescription.trim() || undefined })
      setKnowledgeBases((prev) => [...prev, kb])
      setActiveKbId(kb.id)
      setKbModalOpen(false)
      setError(null)
    } catch (e) {
      setFormError(e instanceof Error ? e.message : '创建失败')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteKb = async () => {
    if (!kbToDelete) return
    try {
      await deleteKnowledgeBase(kbToDelete.id)
      setKnowledgeBases((prev) => prev.filter((kb) => kb.id !== kbToDelete.id))
      setActiveKbId((current) => (current === kbToDelete.id ? null : current))
      setKbToDelete(null)
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : '删除失败')
      setKbToDelete(null)
    }
  }

  if (loading) {
    return (
      <div className="app-loading">
        <Spinner size={24} />
        <span>加载中</span>
      </div>
    )
  }

  return (
    <div className="app">
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="brand">
          <div className="brand-mark">
            <Database size={20} />
          </div>
          <div>
            <strong>AI 知识库</strong>
            <span>Knowledge Base</span>
          </div>
        </div>
        <div className="sidebar-section">
          <div className="section-label">知识库</div>
          <div className="kb-list">
            {knowledgeBases.map((kb) => (
              <button
                key={kb.id}
                type="button"
                className={`kb-item ${activeKbId === kb.id ? 'active' : ''}`}
                onClick={() => {
                  setActiveKbId(kb.id)
                  setSidebarOpen(false)
                }}
              >
                <BookOpen size={16} />
                <span className="kb-name">{kb.name}</span>
              </button>
            ))}
            {knowledgeBases.length === 0 && <p className="muted">暂无知识库</p>}
          </div>
        </div>
        <div className="sidebar-footer">
          <Button variant="primary" className="full" onClick={openCreateModal}>
            <Plus size={16} />
            新建知识库
          </Button>
        </div>
      </aside>

      {sidebarOpen && <div className="sidebar-backdrop" onClick={() => setSidebarOpen(false)} />}

      <main className="main">
        <header className="topbar">
          <IconButton label="打开侧边栏" className="menu-btn" onClick={() => setSidebarOpen(true)}>
            <Menu size={20} />
          </IconButton>
          <div className="topbar-title">
            <h1>{activeKb?.name ?? 'AI 知识库'}</h1>
            <p>{activeKb?.description || '选择一个知识库开始'}</p>
          </div>
          {activeKb && (
            <div className="topbar-actions">
              <div className="segmented">
                <button
                  type="button"
                  className={view === 'documents' ? 'active' : ''}
                  onClick={() => setView('documents')}
                >
                  <FileText size={16} />
                  资料库
                </button>
                <button
                  type="button"
                  className={view === 'questions' ? 'active' : ''}
                  onClick={() => setView('questions')}
                >
                  <ListChecks size={16} />
                  题库管理
                </button>
                <button
                  type="button"
                  className={view === 'chat' ? 'active' : ''}
                  onClick={() => setView('chat')}
                >
                  <MessageSquare size={16} />
                  对话
                </button>
              </div>
              <IconButton label="删除知识库" onClick={() => setKbToDelete(activeKb)}>
                <Trash2 size={18} />
              </IconButton>
            </div>
          )}
        </header>

        {error && (
          <div className="main-pad">
            <ErrorBanner message={error} onDismiss={() => setError(null)} />
          </div>
        )}

        <div className="content">
          {activeKb ? (
            view === 'documents' ? (
              <DocumentsView key={`${activeKb.id}-documents`} knowledgeBase={activeKb} />
            ) : view === 'questions' ? (
              <QuestionsView key={`${activeKb.id}-questions`} knowledgeBase={activeKb} />
            ) : (
              <ChatView key={`${activeKb.id}-chat`} knowledgeBase={activeKb} />
            )
          ) : (
            <div className="main-pad">
              <EmptyState
                icon={<FolderPlus size={28} />}
                title="还没有知识库"
                description="创建知识库后即可上传文档并进行问答。"
                action={
                  <Button variant="primary" onClick={openCreateModal}>
                    <Plus size={16} />
                    新建知识库
                  </Button>
                }
              />
            </div>
          )}
        </div>
      </main>

      {kbModalOpen && (
        <Modal title="新建知识库" onClose={() => setKbModalOpen(false)}>
          <div className="form">
            <label>
              名称
              <input
                autoFocus
                value={kbName}
                onChange={(e) => setKbName(e.target.value)}
                placeholder="例如：产品手册"
              />
            </label>
            <label>
              描述
              <textarea
                value={kbDescription}
                onChange={(e) => setKbDescription(e.target.value)}
                placeholder="可选"
              />
            </label>
            {formError && <ErrorBanner message={formError} onDismiss={() => setFormError(null)} />}
            <div className="modal-actions">
              <Button onClick={() => setKbModalOpen(false)}>取消</Button>
              <Button variant="primary" disabled={!kbName.trim() || saving} onClick={handleCreate}>
                {saving && <Spinner size={16} />}
                创建
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {kbToDelete && (
        <Modal title="删除知识库" onClose={() => setKbToDelete(null)}>
          <p className="modal-copy">
            删除“{kbToDelete.name}”会同时删除其中的文档、向量数据和会话，且无法恢复。
          </p>
          <div className="modal-actions">
            <Button onClick={() => setKbToDelete(null)}>取消</Button>
            <Button variant="danger" onClick={handleDeleteKb}>
              <Trash2 size={16} />
              删除
            </Button>
          </div>
        </Modal>
      )}
    </div>
  )
}
