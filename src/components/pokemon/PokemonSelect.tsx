import { useEffect, useId, useRef, useState } from 'react'

interface SelectOption {
  value: string
  label: string
}

interface PokemonSelectProps {
  label: string
  value: string
  options: SelectOption[]
  onChange: (value: string) => void
  disabled?: boolean
}

export default function PokemonSelect({ label, value, options, onChange, disabled = false }: PokemonSelectProps) {
  const [open, setOpen] = useState(false)
  const selectedIndex = Math.max(0, options.findIndex((option) => option.value === value))
  const [activeIndex, setActiveIndex] = useState(selectedIndex)
  const rootRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const optionRefs = useRef<(HTMLLIElement | null)[]>([])
  const labelId = useId()
  const valueId = useId()
  const listboxId = useId()

  useEffect(() => {
    if (!open) return
    optionRefs.current[activeIndex]?.focus()
  }, [activeIndex, open])

  useEffect(() => {
    if (!open) return

    const closeOnOutsideClick = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', closeOnOutsideClick)
    return () => document.removeEventListener('pointerdown', closeOnOutsideClick)
  }, [open])

  function openList() {
    if (disabled) return
    setActiveIndex(selectedIndex)
    setOpen(true)
  }

  function closeList(restoreFocus = false) {
    setOpen(false)
    if (restoreFocus) window.requestAnimationFrame(() => triggerRef.current?.focus())
  }

  function chooseOption(index: number) {
    onChange(options[index].value)
    closeList(true)
  }

  function handleListKeyDown(event: React.KeyboardEvent) {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      const direction = event.key === 'ArrowDown' ? 1 : -1
      setActiveIndex((current) => (current + direction + options.length) % options.length)
    } else if (event.key === 'Home' || event.key === 'End') {
      event.preventDefault()
      setActiveIndex(event.key === 'Home' ? 0 : options.length - 1)
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      chooseOption(activeIndex)
    } else if (event.key === 'Escape') {
      event.preventDefault()
      closeList(true)
    }
  }

  return (
    <div
      ref={rootRef}
      className="pokedex-control pokemon-select"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOpen(false)
      }}
    >
      <span id={labelId} className="pokemon-select-label">{label}</span>
      <button
        ref={triggerRef}
        type="button"
        className="pokemon-select-trigger"
        aria-labelledby={`${labelId} ${valueId}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listboxId : undefined}
        disabled={disabled}
        onClick={() => open ? closeList() : openList()}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown' || event.key === 'ArrowUp' || event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            if (open) chooseOption(activeIndex)
            else openList()
          } else if (event.key === 'Escape' && open) {
            event.preventDefault()
            closeList(true)
          }
        }}
      >
        <span id={valueId}>{options[selectedIndex]?.label}</span>
        <span className={`pokemon-select-chevron ${open ? 'is-open' : ''}`} aria-hidden="true" />
      </button>

      {open && (
        <ul
          id={listboxId}
          className="pokemon-select-list"
          role="listbox"
          aria-labelledby={labelId}
          onKeyDown={handleListKeyDown}
        >
          {options.map((option, index) => (
            <li
              key={option.value}
              ref={(element) => { optionRefs.current[index] = element }}
              className="pokemon-select-option"
              role="option"
              aria-selected={index === selectedIndex}
              tabIndex={index === activeIndex ? 0 : -1}
              onClick={() => chooseOption(index)}
            >
              <span>{option.label}</span>
              {index === selectedIndex && <span aria-hidden="true">✓</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
