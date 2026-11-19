import { useEffect, useId, useRef, type ReactNode } from 'react'

interface DialogShellProps {
  title: string
  onClose: () => void
  children: ReactNode
  className?: string
}

export default function DialogShell({ title, onClose, children, className = '' }: DialogShellProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const returnFocusRef = useRef<HTMLElement | null>(null)
  const titleId = useId()

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return

    if (!returnFocusRef.current) returnFocusRef.current = document.activeElement as HTMLElement | null
    const previousOverflow = document.body.style.overflow
    if (!dialog.open) dialog.showModal()
    closeButtonRef.current?.focus()
    document.body.style.overflow = 'hidden'

    return () => {
      document.body.style.overflow = previousOverflow
      const previousFocus = returnFocusRef.current
      if (previousFocus?.isConnected) previousFocus.focus()
    }
  }, [])

  return (
    <dialog
      ref={dialogRef}
      className={`pokemon-dialog ${className}`}
      aria-labelledby={titleId}
      onClose={onClose}
      onCancel={(event) => {
        event.preventDefault()
        event.currentTarget.close()
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) event.currentTarget.close()
      }}
    >
      <div className="pokemon-dialog-surface">
        <header className="pokemon-dialog-header">
          <h2 id={titleId}>{title}</h2>
          <button
            ref={closeButtonRef}
            type="button"
            className="pokemon-dialog-close"
            aria-label="Close dialog"
            autoFocus
            onClick={() => dialogRef.current?.close()}
          >
            ×
          </button>
        </header>
        {children}
      </div>
    </dialog>
  )
}
