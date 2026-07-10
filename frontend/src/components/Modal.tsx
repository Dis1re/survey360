interface ModalProps {
  title: string
  children: React.ReactNode
}

export function Modal({ title, children }: ModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-gray-50 rounded-2xl shadow-xl">
        <div className="sticky top-0 bg-gray-50 px-6 pt-5 pb-3 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  )
}
