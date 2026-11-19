import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import useTheme from '../hooks/useTheme'
import {
  fetchJson,
  fetchPokemonDetail,
  formatPokemonName,
  POKEMON_API_URL,
  type PokemonDetail,
  type PokemonSummary,
} from './pokemon/model'
import { PokemonArtwork } from './pokemon/PokemonVisuals'
import './PokemonGame.css'

interface GameRound {
  pokemon: PokemonSummary
  choices: PokemonSummary[]
}

const ROUND_SECONDS = 15
const BEST_SCORE_KEY = 'pokemon-game-best-score'

function readBestScore(): number {
  try {
    const stored = Number(window.localStorage.getItem(BEST_SCORE_KEY))
    return Number.isFinite(stored) && stored > 0 ? Math.floor(stored) : 0
  } catch {
    return 0
  }
}

function shuffle<T>(items: T[]): T[] {
  const shuffled = [...items]
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1))
    ;[shuffled[index], shuffled[randomIndex]] = [shuffled[randomIndex], shuffled[index]]
  }
  return shuffled
}

function createRound(catalog: PokemonSummary[], previousName?: string): GameRound {
  const available = catalog.filter((pokemon) => pokemon.name !== previousName)
  const pokemon = available[Math.floor(Math.random() * available.length)]
  const distractors = shuffle(catalog.filter((item) => item.name !== pokemon.name)).slice(0, 3)
  return { pokemon, choices: shuffle([pokemon, ...distractors]) }
}

export default function PokemonGame() {
  const { theme, toggleTheme } = useTheme()
  const [catalog, setCatalog] = useState<PokemonSummary[]>([])
  const [round, setRound] = useState<GameRound | null>(null)
  const [detail, setDetail] = useState<PokemonDetail | null>(null)
  const [selectedName, setSelectedName] = useState('')
  const [timedOut, setTimedOut] = useState(false)
  const [timeLeft, setTimeLeft] = useState(ROUND_SECONDS)
  const [roundNumber, setRoundNumber] = useState(1)
  const [score, setScore] = useState(0)
  const [bestScore, setBestScore] = useState(readBestScore)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [retryVersion, setRetryVersion] = useState(0)

  useEffect(() => {
    const controller = new AbortController()

    async function loadCatalog() {
      setLoading(true)
      setError('')
      try {
        const data = await fetchJson<{ results: PokemonSummary[] }>(
          `${POKEMON_API_URL}/pokemon?limit=1000`,
          controller.signal,
        )
        if (controller.signal.aborted) return
        setCatalog(data.results)
        setRound(createRound(data.results))
      } catch {
        if (!controller.signal.aborted) setError('The Pokémon could not be loaded. Check your connection and try again.')
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }

    void loadCatalog()
    return () => controller.abort()
  }, [retryVersion])

  useEffect(() => {
    if (!round) return
    const pokemon = round.pokemon
    const controller = new AbortController()
    setDetail(null)
    setSelectedName('')
    setTimedOut(false)
    setTimeLeft(ROUND_SECONDS)
    setError('')

    async function loadPokemon() {
      try {
        const result = await fetchPokemonDetail(pokemon.url, controller.signal)
        if (!controller.signal.aborted) setDetail(result)
      } catch {
        if (!controller.signal.aborted) setError('This Pokémon could not be loaded. Please try again.')
      }
    }

    void loadPokemon()
    return () => controller.abort()
  }, [round])

  const answered = Boolean(selectedName) || timedOut
  const correct = answered && selectedName === round?.pokemon.name

  useEffect(() => {
    if (!detail || answered || timeLeft <= 0) return
    const timer = window.setTimeout(() => {
      setTimeLeft((current) => Math.max(0, current - 1))
    }, 1000)
    return () => window.clearTimeout(timer)
  }, [answered, detail, timeLeft])

  useEffect(() => {
    if (detail && timeLeft === 0 && !answered) setTimedOut(true)
  }, [answered, detail, timeLeft])

  useEffect(() => {
    if (score <= bestScore) return
    setBestScore(score)
    try {
      window.localStorage.setItem(BEST_SCORE_KEY, String(score))
    } catch {
      // The current game still works when storage is unavailable.
    }
  }, [bestScore, score])

  function selectAnswer(name: string) {
    if (answered || !detail) return
    setSelectedName(name)
    if (name === round?.pokemon.name) setScore((current) => current + 1)
  }

  function nextRound() {
    if (!round) return
    setRoundNumber((current) => current + 1)
    setRound(createRound(catalog, round.pokemon.name))
  }

  return (
    <div className="pokemon-game-page">
      <header className="pokemon-game-header">
        <div className="pokemon-game-header-inner">
          <div>
            <h1>Who’s that Pokémon?</h1>
            <p>Study the silhouette, then choose the matching name.</p>
          </div>
          <div className="pokemon-game-header-actions">
            <Link to="/pokemon" className="pokemon-game-back">Back to Explorer</Link>
            <button
              type="button"
              className="pokemon-theme-toggle"
              aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              onClick={toggleTheme}
            >
              {theme === 'dark' ? 'Light' : 'Dark'}
            </button>
          </div>
        </div>
      </header>

      <main className="pokemon-game-main">
        <div className="pokemon-game-scoreboard" aria-label="Game progress">
          <span>Round <strong>{roundNumber}</strong></span>
          <span
            className={`pokemon-game-timer ${!answered && timeLeft <= 5 ? 'is-low' : ''}`}
            role="timer"
            aria-label={`${timeLeft} seconds remaining`}
          >
            Time <strong>{timeLeft}s</strong>
          </span>
          <span className="pokemon-game-scores">
            <span>Score <strong>{score}</strong></span>
            <span>Best <strong>{bestScore}</strong></span>
          </span>
        </div>

        {error && (
          <div className="pokemon-game-error" role="alert">
            <p>{error}</p>
            <button type="button" onClick={() => setRetryVersion((current) => current + 1)}>Try again</button>
          </div>
        )}

        <section className="pokemon-game-board" aria-label="Pokémon guessing game" aria-busy={loading || !detail}>
          <div className={`pokemon-game-artwork ${answered ? 'is-revealed' : ''}`}>
            {detail ? (
              <PokemonArtwork detail={detail} concealed={!answered} />
            ) : (
              <div className="pokemon-game-art-placeholder" aria-hidden="true">?</div>
            )}
          </div>

          <div className="pokemon-game-quiz">
            <div className="pokemon-game-prompt">
              <h2>{answered ? (timedOut ? 'Time’s up!' : correct ? 'You got it!' : 'Not quite this time') : 'Choose a name'}</h2>
              <p aria-live="polite">
                {answered && round
                  ? `It’s ${formatPokemonName(round.pokemon.name)}!`
                  : 'One of these four Pokémon matches the silhouette.'}
              </p>
            </div>

            <div className="pokemon-game-options" aria-label="Answer choices">
              {round?.choices.map((choice, index) => {
                const isSelected = selectedName === choice.name
                const isAnswer = answered && choice.name === round.pokemon.name
                const isIncorrect = answered && isSelected && !isAnswer
                return (
                  <button
                    key={choice.name}
                    type="button"
                    className={`pokemon-game-option ${isAnswer ? 'is-correct' : ''} ${isIncorrect ? 'is-incorrect' : ''}`}
                    disabled={!detail || answered}
                    onClick={() => selectAnswer(choice.name)}
                  >
                    <span className="pokemon-game-option-letter" aria-hidden="true">{String.fromCharCode(65 + index)}</span>
                    <span>{formatPokemonName(choice.name)}</span>
                    {isAnswer && <span aria-hidden="true">✓</span>}
                    {isIncorrect && <span aria-hidden="true">×</span>}
                  </button>
                )
              })}
            </div>

            {answered && (
              <button type="button" className="pokemon-game-next" onClick={nextRound}>
                Next Pokémon
              </button>
            )}
          </div>
        </section>
      </main>
    </div>
  )
}
