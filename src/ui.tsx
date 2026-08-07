import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { AlertCircle, Loader2, X } from 'lucide-react'

export function Spinner({ size = 16 }: { size?: number }) {
  return <Loader2 size={size} className="spin" aria-label="加载中" />
}

export function ErrorBanner({ message, onDismiss }: { message: string; onDismiss?: () => void }) {
  return (
    <div className="error-banner" role="alert">
      <AlertCircle size={16} />
      <span>{message}</span>
      {onDismiss && (
        <IconButton label="关闭" onClick={onDismiss}>
          <X size={16} />
        </IconButton>
      )}
    </div>
  )
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost'
  size?: 'sm' | 'md'
}

export function Button({
  variant = 'secondary',
  size = 'md',
  className = '',
  ...props
}: ButtonProps) {
  return <button type="button" className={`btn btn-${variant} btn-${size} ${className}`} {...props} />
}

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string
}

export function IconButton({ label, className = '', ...props }: IconButtonProps) {
  return <button type="button" className={`icon-btn ${className}`} aria-label={label} title={label} {...props} />
}

export function Modal({
  title,
  onClose,
  children,
}: {
  title: string
  onClose: () => void
  children: ReactNode
}) {
  return (
    <div
      className="modal-overlay"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div className="modal" role="dialog" aria-modal="true" aria-label={title}>
        <div className="modal-head">
          <h2>{title}</h2>
          <IconButton label="关闭" onClick={onClose}>
            <X size={18} />
          </IconButton>
        </div>
        {children}
      </div>
    </div>
  )
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: ReactNode
  title: string
  description?: string
  action?: ReactNode
}) {
  return (
    <div className="empty-state">
      <div className="empty-icon">{icon}</div>
      <h3>{title}</h3>
      {description && <p>{description}</p>}
      {action}
    </div>
  )
}
