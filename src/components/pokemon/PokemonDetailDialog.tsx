import { useEffect, useState } from 'react'
import CryButton from './CryButton'
import DialogShell from './DialogShell'
import {
  fetchJson,
  formatHeight,
  formatPokemonName,
  formatWeight,
  getPokemonId,
  type EvolutionNode,
  type PokemonDetail,
} from './model'
import { getAccentStyle, PokemonArtwork, StatList, TypeList } from './PokemonVisuals'

interface SpeciesResponse {
  genera: { genus: string; language: { name: string } }[]
  flavor_text_entries: { flavor_text: string; language: { name: string } }[]
  evolution_chain: { url: string }
}

interface EvolutionResponse {
  chain: EvolutionNode
}

interface SpeciesInfo {
  genus: string
  description: string
}

function EvolutionBranch({
  node,
  currentName,
  showArrow = false,
}: {
  node: EvolutionNode
  currentName: string
  showArrow?: boolean
}) {
  const spriteId = getPokemonId(node.species)

  return (
    <li className={`evolution-branch ${node.evolves_to.length > 1 ? 'is-branching' : ''}`}>
      <div className="evolution-node">
        {showArrow && <span className="evolution-arrow" aria-hidden="true">→</span>}
        <span className={`evolution-stage ${node.species.name === currentName ? 'is-current' : ''}`}>
          {spriteId > 0 && (
            <img
              className="evolution-icon"
              src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${spriteId}.png`}
              alt=""
              width={40}
              height={40}
              loading="lazy"
            />
          )}
          <span>{formatPokemonName(node.species.name)}</span>
        </span>
      </div>
      {node.evolves_to.length > 0 && (
        <ul>
          {node.evolves_to.map((child) => (
            <EvolutionBranch key={child.species.name} node={child} currentName={currentName} showArrow />
          ))}
        </ul>
      )}
    </li>
  )
}

interface PokemonDetailDialogProps {
  pokemon: PokemonDetail
  shiny: boolean
  onClose: () => void
}

export default function PokemonDetailDialog({ pokemon, shiny, onClose }: PokemonDetailDialogProps) {
  const [speciesInfo, setSpeciesInfo] = useState<SpeciesInfo | null>(null)
  const [evolution, setEvolution] = useState<EvolutionNode | null>(null)
  const [loading, setLoading] = useState(true)
  const [extraError, setExtraError] = useState('')
  const primaryType = pokemon.types[0]?.type.name || 'normal'

  useEffect(() => {
    const controller = new AbortController()

    async function loadExtraDetails() {
      if (!pokemon.species?.url) {
        setLoading(false)
        setExtraError('Description and evolution details are unavailable.')
        return
      }

      setLoading(true)
      setExtraError('')
      try {
        const species = await fetchJson<SpeciesResponse>(pokemon.species.url, controller.signal)
        if (controller.signal.aborted) return

        const genus = species.genera.find((entry) => entry.language.name === 'en')?.genus || ''
        const flavorText = species.flavor_text_entries.find((entry) => entry.language.name === 'en')?.flavor_text || ''
        setSpeciesInfo({ genus, description: flavorText.replace(/\s+/g, ' ').trim() })

        const evolutionData = await fetchJson<EvolutionResponse>(species.evolution_chain.url, controller.signal)
        if (!controller.signal.aborted) setEvolution(evolutionData.chain)
      } catch {
        if (!controller.signal.aborted) setExtraError('Some description or evolution details could not be loaded.')
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }

    void loadExtraDetails()
    return () => controller.abort()
  }, [pokemon])

  return (
    <DialogShell title={`${formatPokemonName(pokemon.name)} details`} onClose={onClose} className="pokemon-detail-dialog">
      <div className="pokemon-detail-content" style={getAccentStyle(primaryType)}>
        <div className="pokemon-detail-overview">
          <div className="sprite-wrap pokemon-detail-artwork">
            <div className={`type-particles type-particles-${primaryType}`} aria-hidden="true">
              {Array.from({ length: 6 }, (_, index) => <span key={index} />)}
            </div>
            <PokemonArtwork detail={pokemon} shiny={shiny} />
          </div>

          <div className="pokemon-detail-summary">
            <span className="pokemon-detail-number">#{pokemon.id}</span>
            <TypeList types={pokemon.types} />
            {speciesInfo?.genus && <p className="pokemon-detail-genus">{speciesInfo.genus}</p>}
            <p className="pokemon-detail-description">
              {speciesInfo?.description || (loading ? 'Loading description…' : 'No description available.')}
            </p>
            <div className="pokemon-detail-physical">
              <span><strong>Height</strong>{formatHeight(pokemon.height)}</span>
              <span><strong>Weight</strong>{formatWeight(pokemon.weight)}</span>
            </div>
            <CryButton key={pokemon.name} pokemon={pokemon} />
          </div>
        </div>

        <section className="pokemon-detail-section">
          <h3>Abilities</h3>
          <ul className="pokemon-abilities">
            {pokemon.abilities?.map((entry) => (
              <li key={entry.ability.name}>
                {formatPokemonName(entry.ability.name)}
                {entry.is_hidden && <span>Hidden ability</span>}
              </li>
            ))}
          </ul>
        </section>

        <section className="pokemon-detail-section">
          <h3>Base stats</h3>
          <StatList detail={pokemon} />
        </section>

        <section className="pokemon-detail-section">
          <h3>Evolution</h3>
          {loading && <p role="status">Loading evolution details…</p>}
          {extraError && <p className="pokemon-dialog-error" role="alert">{extraError}</p>}
          {evolution ? (
            <ul className="evolution-tree">
              <EvolutionBranch node={evolution} currentName={pokemon.name} />
            </ul>
          ) : !loading && !extraError ? <p>No evolution details available.</p> : null}
        </section>
      </div>
    </DialogShell>
  )
}
