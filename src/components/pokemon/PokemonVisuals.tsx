import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import {
  formatPokemonName,
  getArtworkCandidates,
  getStat,
  getTypeColor,
  MAX_STAT_VALUE,
  type PokemonDetail,
} from './model'

export function getAccentStyle(type: string): CSSProperties {
  const accentColor = getTypeColor(type)
  return {
    '--pokemon-accent': accentColor,
    '--pokemon-accent-soft': `${accentColor}16`,
    '--pokemon-accent-border': `${accentColor}45`,
  } as CSSProperties
}

interface PokemonArtworkProps {
  detail: PokemonDetail
  shiny?: boolean
  concealed?: boolean
}

export function PokemonArtwork({ detail, shiny = false, concealed = false }: PokemonArtworkProps) {
  const candidates = useMemo(() => getArtworkCandidates(detail, shiny), [detail, shiny])
  const [candidateIndex, setCandidateIndex] = useState(0)

  useEffect(() => setCandidateIndex(0), [detail, shiny])

  const source = candidates[candidateIndex]
  if (!source) return <div className="sprite-placeholder">No image</div>

  return (
    <img
      key={source}
      src={source}
      alt={concealed ? 'Hidden Pokémon silhouette' : `${shiny ? 'Shiny ' : ''}${formatPokemonName(detail.name)}`}
      width={220}
      height={220}
      onError={() => setCandidateIndex((current) => current + 1)}
    />
  )
}

interface TypeListProps {
  types: { type: { name: string } }[]
}

export function TypeList({ types }: TypeListProps) {
  return (
    <div className="type-list">
      {types.map((entry) => {
        const typeColor = getTypeColor(entry.type.name)
        return (
          <span
            key={entry.type.name}
            className="type-pill"
            style={{
              '--type-color': typeColor,
              '--type-color-soft': `${typeColor}16`,
              '--type-color-border': `${typeColor}55`,
            } as CSSProperties}
          >
            {entry.type.name}
          </span>
        )
      })}
    </div>
  )
}

interface StatListProps {
  detail: PokemonDetail
  comparisonTo?: PokemonDetail
}

export function StatList({ detail, comparisonTo }: StatListProps) {
  return (
    <dl className="stat-list">
      {detail.stats.map((stat) => {
        const otherValue = comparisonTo ? getStat(comparisonTo, stat.stat.name) : null
        const isHigher = otherValue !== null && stat.base_stat > otherValue
        return (
          <div key={stat.stat.name} className="stat-item">
            <dt>{stat.stat.name.replace(/-/g, ' ')}</dt>
            <dd className={isHigher ? 'is-higher' : ''}>{stat.base_stat}</dd>
            <div className="stat-track" aria-hidden="true">
              <span style={{ width: `${Math.min(100, (stat.base_stat / MAX_STAT_VALUE) * 100)}%` }} />
            </div>
          </div>
        )
      })}
    </dl>
  )
}
