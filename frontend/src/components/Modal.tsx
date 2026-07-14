import { useEffect, useId } from 'react'

type ModalSize = 'sm' | 'md' | 'lg' | 'xl' | 'full'

const sizeClass: Record<ModalSize, string> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-2xl',
  full: 'w-full max-w-[95vw]',
}

export interface ModalProps {
  title: string
  description?: string
  children: React.ReactNode
  footer?: React.ReactNode
  size?: ModalSize
  onClose?: () => void
  closeOnBackdrop?: boolean
  closeOnEscape?: boolean
  preventClose?: boolean
  scrollable?: boolean
}

export function Modal({
  title,
  description,
  children,
  footer,
  size = 'xl',
  onClose,
  closeOnBackdrop = true,
  closeOnEscape = true,
  preventClose = false,
  scrollable = true,
}: ModalProps) {
  const titleId = useId()

  useEffect(() => {
    if (!onClose || !closeOnEscape || preventClose) return

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose, closeOnEscape, preventClose])

  const handleBackdropClick = () => {
    if (!onClose || !closeOnBackdrop || preventClose) return
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-[2px] modal-backdrop-enter"
      onClick={handleBackdropClick}
    >
      <div
        className={`w-full ${sizeClass[size]} bg-white rounded-2xl shadow-xl overflow-hidden modal-panel-enter ${
          scrollable ? (size === 'full' ? 'h-[92vh] flex flex-col' : 'max-h-[90vh] flex flex-col') : ''
        }`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 px-5 pt-5 pb-3 border-b border-gray-100 shrink-0">
          <div className="min-w-0">
            <h2 id={titleId} className="text-base font-bold text-gray-900">
              {title}
            </h2>
            {description && (
              <p className="text-sm text-gray-500 mt-1 leading-relaxed">{description}</p>
            )}
          </div>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              disabled={preventClose}
              className="shrink-0 p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition cursor-pointer disabled:opacity-50"
              aria-label="Закрыть"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        <div className={`px-5 py-4 ${scrollable ? 'overflow-y-auto' : ''}`}>{children}</div>

        {footer && <div className="px-5 pb-5 shrink-0">{footer}</div>}
      </div>
    </div>
  )
}
