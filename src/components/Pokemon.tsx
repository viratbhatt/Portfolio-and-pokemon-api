import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import ComparePokemonDialog from './pokemon/ComparePokemonDialog'
import './PokemonFeatures.css'
import PokemonCard, { PokemonCardSkeleton } from './pokemon/PokemonCard'
import PokemonDetailDialog from './pokemon/PokemonDetailDialog'
import PokemonSelect from './pokemon/PokemonSelect'
import useTheme from '../hooks/useTheme'
import {
  formatPokemonName,
  getPokemonId,
  getStat,
  isCompleteDetail,
  POKEMON_TYPES,
  type PokemonDetail,
  type SortOption,
} from './pokemon/model'
import { usePokemonCatalog, usePokemonDetails } from './pokemon/usePokemonData'

const PAGE_SIZE = 12

type ActiveDialog = { kind: 'detail'; name: string } | { kind: 'compare' } | null

function Pokemon() {
  const { theme, toggleTheme } = useTheme()
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedType, setSelectedType] = useState('all')
  const [sortMode, setSortMode] = useState<SortOption>('id')
  const [page, setPage] = useState(1)
  const [pageInput, setPageInput] = useState('1')
  const [shiny, setShiny] = useState(false)
  const [compareNames, setCompareNames] = useState<string[]>([])
  const [activeDialog, setActiveDialog] = useState<ActiveDialog>(null)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [summaryStuck, setSummaryStuck] = useState(false)
  const summaryRef = useRef<HTMLElement>(null)
  const previousPage = useRef(page)

  const { sourceSummaries, loading: sourceLoading, error } = usePokemonCatalog(selectedType)

  const filteredList = useMemo(() => {
    const lowerSearch = searchTerm.trim().toLowerCase()
    if (!lowerSearch) return sourceSummaries

    return sourceSummaries.filter((pokemon) => (
      pokemon.name.includes(lowerSearch) || String(getPokemonId(pokemon)).includes(lowerSearch)
    ))
  }, [sourceSummaries, searchTerm])

  const globallySortedList = useMemo(() => {
    return [...filteredList].sort((a, b) => {
      if (sortMode === 'name') return a.name.localeCompare(b.name) || getPokemonId(a) - getPokemonId(b)
      return getPokemonId(a) - getPokemonId(b)
    })
  }, [filteredList, sortMode])

  const pageCount = Math.max(1, Math.ceil(globallySortedList.length / PAGE_SIZE))

  useEffect(() => {
    setPage((current) => Math.min(current, pageCount))
  }, [pageCount])

  const pageSummaries = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE
    return globallySortedList.slice(start, start + PAGE_SIZE)
  }, [globallySortedList, page])

  const { details, failedNames, loadingDetails, retryDetails } = usePokemonDetails(pageSummaries)
  const pageDetailsReady = pageSummaries.every((pokemon) => isCompleteDetail(details[pokemon.name]))
  const isStatSort = sortMode === 'hp' || sortMode === 'attack' || sortMode === 'speed'

  const visiblePokemon = useMemo(() => {
    if (!isStatSort || !pageDetailsReady) return pageSummaries
    return [...pageSummaries].sort((a, b) => (
      getStat(details[b.name], sortMode) - getStat(details[a.name], sortMode)
      || getPokemonId(a) - getPokemonId(b)
    ))
  }, [details, isStatSort, pageDetailsReady, pageSummaries, sortMode])

  useEffect(() => {
    const summary = summaryRef.current
    if (!summary) return

    const updateSummaryState = () => {
      setSummaryStuck(summary.getBoundingClientRect().top <= 0)
    }

    updateSummaryState()
    window.addEventListener('scroll', updateSummaryState, { passive: true })
    window.addEventListener('resize', updateSummaryState)
    return () => {
      window.removeEventListener('scroll', updateSummaryState)
      window.removeEventListener('resize', updateSummaryState)
    }
  }, [])

  useEffect(() => {
    if (previousPage.current === page) return
    previousPage.current = page
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    window.scrollTo({ top: 0, behavior: reducedMotion ? 'auto' : 'smooth' })
  }, [page])

  useEffect(() => {
    setPageInput(String(page))
  }, [page])

  function jumpToPage(event: React.FormEvent) {
    event.preventDefault()
    const requestedPage = Number(pageInput)
    if (!pageInput || !Number.isFinite(requestedPage)) return
    const targetPage = Math.min(pageCount, Math.max(1, Math.floor(requestedPage)))
    setPage(targetPage)
  }

  function toggleCompare(name: string) {
    setCompareNames((current) => {
      if (current.includes(name)) return current.filter((item) => item !== name)
      if (current.length >= 2) return current
      return [...current, name]
    })
  }

  const selectedDetail = activeDialog?.kind === 'detail' ? details[activeDialog.name] : undefined

  let comparisonDetails: [PokemonDetail, PokemonDetail] | null = null
  if (activeDialog?.kind === 'compare' && compareNames.length === 2) {
    const first = details[compareNames[0]]
    const second = details[compareNames[1]]
    if (isCompleteDetail(first) && isCompleteDetail(second)) comparisonDetails = [first, second]
  }

  const comparisonReady = compareNames.length === 2
    && compareNames.every((name) => isCompleteDetail(details[name]))
  const activeFilterCount = Number(selectedType !== 'all') + Number(sortMode !== 'id') + Number(shiny)

  return (
    <div className={`app-shell pokemon-page ${compareNames.length ? 'has-comparison' : ''}`}>
      <header className="hero-card pokemon-page-header">
        <div>
          <div className="pokemon-title-row">
            <h1>Pokémon Explorer</h1>
            <div className="pokemon-title-actions">
              <Link to="/pokemonGame" className="pokemon-game-link">Play guessing game</Link>
              <Link
                to="/"
                className="pokemon-back-to-portfolio"
                aria-label="Go to portfolio home"
              >
                Portfolio
              </Link>
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
          <p>Search, compare, and explore Pokémon details from the PokéAPI.</p>
        </div>

        <div className="search-input-container">
          <input
            value={searchTerm}
            onChange={(event) => {
              setSearchTerm(event.target.value)
              setPage(1)
            }}
            placeholder="Search Pokémon by name or ID"
            className="search-input"
            aria-label="Search Pokémon"
          />
          <img
            src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/6.gif"
            alt="Scanning"
            className="pokemon-scan-gif"
          />
        </div>
      </header>

      <button
        type="button"
        className="pokemon-filter-toggle"
        aria-expanded={filtersOpen}
        aria-controls="pokemon-filter-panel"
        onClick={() => setFiltersOpen((current) => !current)}
      >
        <span>Filters & sorting</span>
        {activeFilterCount > 0 && <span className="pokemon-filter-active">{activeFilterCount} active</span>}
        <span className={`pokemon-select-chevron ${filtersOpen ? 'is-open' : ''}`} aria-hidden="true" />
      </button>

      <section
        id="pokemon-filter-panel"
        className={`pokedex-controls pokemon-filter-panel ${filtersOpen ? 'is-open' : ''}`}
        aria-label="Pokémon filters and sorting"
      >
          <PokemonSelect
            label="Type"
            value={selectedType}
            disabled={sourceLoading && selectedType === 'all'}
            options={[
              { value: 'all', label: 'All types' },
              ...POKEMON_TYPES.map((type) => ({ value: type, label: formatPokemonName(type) })),
            ]}
            onChange={(value) => {
              setSelectedType(value)
              setPage(1)
            }}
          />

          <PokemonSelect
            label="Sort"
            value={sortMode}
            options={[
              { value: 'id', label: 'Pokédex number' },
              { value: 'name', label: 'Name, A–Z' },
              { value: 'hp', label: 'HP, high to low (this page)' },
              { value: 'attack', label: 'Attack, high to low (this page)' },
              { value: 'speed', label: 'Speed, high to low (this page)' },
            ]}
            onChange={(value) => {
              setSortMode(value as SortOption)
              setPage(1)
            }}
          />

          <button
            type="button"
            className="shiny-toggle"
            aria-pressed={shiny}
            onClick={() => setShiny((current) => !current)}
          >
            Shiny artwork {shiny ? 'on' : 'off'}
          </button>
      </section>

      {error && <div className="toast error" role="alert">{error}</div>}

      <section ref={summaryRef} className={summaryStuck ? 'summary-row is-stuck' : 'summary-row'}>
        <span>{filteredList.length} Pokémon found</span>
        <span>Page {page} of {pageCount}</span>
      </section>

      {isStatSort && !pageDetailsReady && !sourceLoading && (
        <p className="pokemon-sort-status" role="status">Loading stats to sort this page…</p>
      )}

      {sourceLoading && <p className="pokemon-sr-only" role="status">Loading Pokémon</p>}

      {!sourceLoading && filteredList.length === 0 ? (
        <div className="status">No Pokémon match your search and type filter.</div>
      ) : (
        <div
          key={`${page}-${selectedType}-${sortMode}`}
          className="grid-list pokemon-grid-enter"
          aria-busy={sourceLoading || loadingDetails}
        >
          {sourceLoading
            ? Array.from({ length: PAGE_SIZE }, (_, index) => <PokemonCardSkeleton key={index} />)
            : visiblePokemon.map((pokemon) => {
              const cachedDetail = details[pokemon.name]
              const detail = isCompleteDetail(cachedDetail) ? cachedDetail : undefined
              return (
                <PokemonCard
                  key={pokemon.name}
                  pokemon={pokemon}
                  detail={detail}
                  shiny={shiny}
                  comparing={compareNames.includes(pokemon.name)}
                  compareDisabled={compareNames.length >= 2}
                  failed={Boolean(failedNames[pokemon.name])}
                  onOpenDetails={(name) => setActiveDialog({ kind: 'detail', name })}
                  onToggleCompare={toggleCompare}
                  onRetry={retryDetails}
                />
              )
            })}
        </div>
      )}

      {compareNames.length > 0 && (
        <aside className="comparison-tray" aria-label="Pokémon comparison selection">
          <div className="comparison-tray-names">
            {compareNames.map((name) => (
              <button key={name} type="button" onClick={() => toggleCompare(name)} aria-label={`Remove ${formatPokemonName(name)} from comparison`}>
                {formatPokemonName(name)} <span aria-hidden="true">×</span>
              </button>
            ))}
          </div>
          <p className="comparison-tray-status" aria-live="polite">
            {compareNames.length === 1 ? 'Select one more Pokémon' : 'Two Pokémon selected'}
          </p>
          <div className="comparison-tray-actions">
            <button type="button" onClick={() => setCompareNames([])}>Clear</button>
            <button
              type="button"
              className="comparison-open"
              disabled={!comparisonReady}
              onClick={() => setActiveDialog({ kind: 'compare' })}
            >
              Compare
            </button>
          </div>
        </aside>
      )}

      <footer className="pagination-row">
        <button
          type="button"
          disabled={sourceLoading || page <= 1}
          onClick={() => setPage((current) => Math.max(1, current - 1))}
        >
          Previous
        </button>

        <form className="pagination-jump" aria-label="Go to a page" onSubmit={jumpToPage} noValidate>
          <label className="pokemon-sr-only" htmlFor="pokemon-page-input">Page number</label>
          <input
            id="pokemon-page-input"
            type="number"
            inputMode="numeric"
            min={1}
            max={pageCount}
            value={pageInput}
            disabled={sourceLoading}
            title={`Enter a page from 1 to ${pageCount}`}
            onChange={(event) => setPageInput(event.target.value.replace(/[^0-9]/g, ''))}
          />
          <button type="submit" disabled={sourceLoading || !pageInput}>Go</button>
        </form>

        <button
          type="button"
          disabled={sourceLoading || page >= pageCount}
          onClick={() => setPage((current) => Math.min(pageCount, current + 1))}
        >
          Next
        </button>
      </footer>

      {activeDialog?.kind === 'detail' && isCompleteDetail(selectedDetail) && (
        <PokemonDetailDialog
          key={selectedDetail.name}
          pokemon={selectedDetail}
          shiny={shiny}
          onClose={() => setActiveDialog(null)}
        />
      )}

      {comparisonDetails && (
        <ComparePokemonDialog
          key={comparisonDetails.map((pokemon) => pokemon.name).join('-')}
          pokemon={comparisonDetails}
          shiny={shiny}
          onClose={() => setActiveDialog(null)}
        />
      )}
    </div>
  )
}

export default Pokemon
