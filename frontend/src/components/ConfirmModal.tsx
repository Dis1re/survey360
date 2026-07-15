import { Modal } from './Modal'

type ConfirmVariant = 'danger' | 'warning' | 'default'

const variantConfig: Record<
  ConfirmVariant,
  {
    iconBg: string
    iconColor: string
    confirmClass: string
    defaultConfirmLabel: string
  }
> = {
  danger: {
    iconBg: 'bg-red-50',
    iconColor: 'text-red-600',
    confirmClass:
      'bg-red-600 hover:bg-red-700 border border-red-700 text-white disabled:opacity-50',
    defaultConfirmLabel: 'Удалить',
  },
  warning: {
    iconBg: 'bg-amber-50',
    iconColor: 'text-amber-600',
    confirmClass:
      'bg-amber-500 hover:bg-amber-600 border border-amber-600 text-white disabled:opacity-50',
    defaultConfirmLabel: 'Продолжить',
  },
  default: {
    iconBg: 'bg-orange-50',
    iconColor: 'text-[#FF8600]',
    confirmClass:
      'bg-[#FF8600] hover:bg-[#FF6B00] border border-[#FF8600] text-white disabled:opacity-50',
    defaultConfirmLabel: 'Подтвердить',
  },
}

function ConfirmIcon({ variant }: { variant: ConfirmVariant }) {
  const { iconColor } = variantConfig[variant]

  if (variant === 'danger') {
    return (
      <svg className={`w-6 h-6 ${iconColor}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
        />
      </svg>
    )
  }

  if (variant === 'warning') {
    return (
      <svg className={`w-6 h-6 ${iconColor}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
        />
      </svg>
    )
  }

  return (
    <svg className={`w-6 h-6 ${iconColor}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  )
}

export interface ConfirmModalProps {
  title: string
  message: React.ReactNode
  variant?: ConfirmVariant
  confirmLabel?: string
  loadingLabel?: string
  cancelLabel?: string
  hideCancel?: boolean
  loading?: boolean
  onConfirm: () => void | Promise<void>
  onCancel: () => void
}

export function ConfirmModal({
  title,
  message,
  variant = 'default',
  confirmLabel,
  loadingLabel,
  cancelLabel = 'Отмена',
  hideCancel = false,
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  const cfg = variantConfig[variant]

  return (
    <Modal
      title={title}
      size="sm"
      onClose={onCancel}
      preventClose={loading}
      scrollable={false}
      footer={
        <div className="flex gap-3">
          {!hideCancel && (
            <button
              type="button"
              onClick={onCancel}
              disabled={loading}
              className="soft-press flex-1 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-[#1e222e] border border-gray-200 dark:border-[#3a4250] hover:bg-gray-50 dark:hover:bg-#1e222e dark:hover:bg-[#262d3a] disabled:opacity-50 rounded-xl cursor-pointer"
            >
              {cancelLabel}
            </button>
          )}
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={`${hideCancel ? 'w-full' : 'flex-1'} soft-press py-2.5 text-sm font-semibold rounded-xl cursor-pointer ${cfg.confirmClass}`}
          >
            {loading ? (loadingLabel ?? 'Подождите…') : (confirmLabel ?? cfg.defaultConfirmLabel)}
          </button>
        </div>
      }
    >
      <div className="flex gap-4">
        <div
          className={`shrink-0 w-11 h-11 rounded-xl flex items-center justify-center ${cfg.iconBg}`}
          aria-hidden="true"
        >
          <ConfirmIcon variant={variant} />
        </div>
        <div className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed pt-0.5">{message}</div>
      </div>
    </Modal>
  )
}
