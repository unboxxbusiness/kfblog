'use client'

import * as React from 'react'

type AlertDialogProps = {
  open: boolean
  title: string
  description: string
  confirmText?: string
  cancelText?: string
  destructive?: boolean
  busy?: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
}

export default function AlertDialog({
  open,
  title,
  description,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  destructive = false,
  busy = false,
  onOpenChange,
  onConfirm,
}: AlertDialogProps) {
  React.useEffect(() => {
    if (!open) return

    const onEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onOpenChange(false)
      }
    }

    window.addEventListener('keydown', onEscape)
    return () => window.removeEventListener('keydown', onEscape)
  }, [open, onOpenChange])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <button
        type="button"
        onClick={() => onOpenChange(false)}
        className="absolute inset-0 bg-black/45"
        aria-label="Close confirmation dialog"
      />

      <section className="relative w-full max-w-md rounded-2xl border border-[#e2e8f0] bg-white p-5 shadow-2xl">
        <h3 className="text-lg font-bold text-[#0f172a]">{title}</h3>
        <p className="mt-2 text-sm text-[#475569]">{description}</p>

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            disabled={busy}
            className="rounded-md border border-[#dbe3f1] px-3 py-2 text-sm font-medium text-[#334155] hover:bg-[#f8fafc] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {cancelText}
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className={`rounded-md px-3 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60 ${
              destructive ? 'bg-[#dc2626] hover:bg-[#b91c1c]' : 'bg-[#4f46e5] hover:bg-[#4338ca]'
            }`}
          >
            {busy ? 'Please wait...' : confirmText}
          </button>
        </div>
      </section>
    </div>
  )
}
