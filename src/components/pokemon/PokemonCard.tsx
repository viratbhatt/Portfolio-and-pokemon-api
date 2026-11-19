import CryButton from './CryButton'
import {
  formatPokemonName,
  getPokemonId,
  type PokemonDetail,
  type PokemonSummary,
} from './model'
import { getAccentStyle, PokemonArtwork, StatList, TypeList } from './PokemonVisuals'

function SkeletonContent() {
  return (
    <div className="pokemon-skeleton-content" aria-hidden="true">
      <div className="pokemon-skeleton-art" />
      <div className="pokemon-skeleton-badges" />
      <div className="pokemon-skeleton-stats">
        {Array.from({ length: 6 }, (_, index) => <span key={index} />)}
      </div>
      <div className="pokemon-skeleton-meta" />
      <div className="pokemon-skeleton-actions" />
    </div>
  )
}

export function PokemonCardSkeleton() {
  return (
    <article className="pokemon-card pokemon-card-skeleton" aria-hidden="true">
      <div className="pokemon-skeleton-heading" />
      <SkeletonContent />
    </article>
  )
}

interface PokemonCardProps {
  pokemon: PokemonSummary
  detail?: PokemonDetail
  shiny: boolean
  comparing: boolean
  compareDisabled: boolean
  failed: boolean
  onOpenDetails: (name: string) => void
  onToggleCompare: (name: string) => void
  onRetry: (name: string) => void
}

export default function PokemonCard({
  pokemon,
  detail,
  shiny,
  comparing,
  compareDisabled,
  failed,
  onOpenDetails,
  onToggleCompare,
  onRetry,
}: PokemonCardProps) {
  const primaryType = detail?.types[0]?.type.name || 'normal'

  if (!detail) {
    return (
      <article className="pokemon-card pokemon-card-skeleton" style={getAccentStyle(primaryType)}>
        <div className="card-header">
          <h2>{pokemon.name}</h2>
          <div className="pokemon-id">#{getPokemonId(pokemon)}</div>
        </div>
        <SkeletonContent />
        {failed && (
          <div className="pokemon-detail-error" role="alert">
            <span>Details unavailable.</span>
            <button type="button" onClick={() => onRetry(pokemon.name)}>Retry</button>
          </div>
        )}
      </article>
    )
  }

  return (
    <article className="pokemon-card" style={getAccentStyle(primaryType)}>
      <div className="card-header">
        <h2>{pokemon.name}</h2>
        <div className="pokemon-id">#{detail.id}</div>
      </div>

      <div className="sprite-wrap">
        <div className={`type-particles type-particles-${primaryType}`} aria-hidden="true">
          {Array.from({ length: 6 }, (_, index) => <span key={index} />)}
        </div>
        <PokemonArtwork detail={detail} shiny={shiny} />
      </div>

      <div className="card-body">
        <div className="pokemon-card-type-row">
          <TypeList types={detail.types} />
          <CryButton pokemon={detail} compact />
        </div>
        <StatList detail={detail} />
        <div className="misc-row">
          <span>Height: {detail.height}</span>
          <span>Weight: {detail.weight}</span>
        </div>
      </div>

      <div className="pokemon-card-actions">
        <button type="button" className="pokemon-card-action" onClick={() => onOpenDetails(pokemon.name)}>
          Details<span className="pokemon-sr-only"> for {formatPokemonName(pokemon.name)}</span>
        </button>
        <button
          type="button"
          className="pokemon-card-action"
          aria-pressed={comparing}
          disabled={compareDisabled && !comparing}
          onClick={() => onToggleCompare(pokemon.name)}
        >
          {comparing ? 'Remove' : 'Compare'}
          <span className="pokemon-sr-only"> {formatPokemonName(pokemon.name)}</span>
        </button>
      </div>
    </article>
  )
}
