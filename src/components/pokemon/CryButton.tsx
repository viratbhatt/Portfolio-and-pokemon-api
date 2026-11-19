import { useEffect, useRef, useState } from 'react'
import { formatPokemonName, type PokemonDetail } from './model'

let activeAudio: HTMLAudioElement | null = null

interface CryButtonProps {
  pokemon: PokemonDetail
  compact?: boolean
}

export default function CryButton({ pokemon, compact = false }: CryButtonProps) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [playing, setPlaying] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const source = pokemon.cries?.latest || pokemon.cries?.legacy || ''
  const pokemonName = formatPokemonName(pokemon.name)
  const actionLabel = !source
    ? `${pokemonName} cry unavailable`
    : loading
      ? `Loading ${pokemonName} cry`
      : `${playing ? 'Pause' : 'Play'} ${pokemonName} cry`

  useEffect(() => {
    const audio = audioRef.current
    audio?.pause()
    if (audio) audio.currentTime = 0
    setPlaying(false)
    setLoading(false)
    setError('')

    return () => {
      audio?.pause()
      if (audio) audio.currentTime = 0
      if (activeAudio === audio) activeAudio = null
    }
  }, [source])

  async function togglePlayback() {
    const audio = audioRef.current
    if (!audio || !source) return

    if (!audio.paused) {
      audio.pause()
      return
    }

    if (activeAudio && activeAudio !== audio) activeAudio.pause()
    activeAudio = audio
    setError('')
    setLoading(true)
    try {
      await audio.play()
    } catch {
      if (activeAudio !== audio) {
        setLoading(false)
        setPlaying(false)
        return
      }
      activeAudio = null
      setLoading(false)
      setPlaying(false)
      setError('This cry could not be played in your browser.')
    }
  }

  return (
    <div className={`cry-control ${compact ? 'is-compact' : ''}`}>
      <audio
        ref={audioRef}
        src={source || undefined}
        preload="none"
        onPlay={() => setPlaying(true)}
        onPlaying={() => {
          setPlaying(true)
          setLoading(false)
        }}
        onPause={() => {
          if (activeAudio === audioRef.current) activeAudio = null
          setPlaying(false)
          setLoading(false)
        }}
        onEnded={() => {
          if (activeAudio === audioRef.current) activeAudio = null
          setPlaying(false)
          setLoading(false)
        }}
        onError={() => {
          if (activeAudio === audioRef.current) activeAudio = null
          setPlaying(false)
          setLoading(false)
          setError('This cry is unavailable right now.')
        }}
      />
      <button
        type="button"
        className={`cry-button ${compact ? 'cry-button-compact' : ''}`}
        aria-label={actionLabel}
        aria-pressed={playing}
        title={compact ? actionLabel : undefined}
        disabled={!source || loading}
        onClick={() => void togglePlayback()}
      >
        <svg className="cry-speaker-icon" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
          <path d="M11 5 6.5 8.5H3v7h3.5L11 19V5Z" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M15 9.5a4 4 0 0 1 0 5M17.5 7a7.5 7.5 0 0 1 0 10" strokeLinecap="round" />
        </svg>
        {!compact && (
          <span>{!source ? 'Cry unavailable' : loading ? 'Loading cry…' : playing ? 'Pause cry' : 'Play cry'}</span>
        )}
      </button>
      {error && <p className="cry-error" role="alert">{error}</p>}
    </div>
  )
}
