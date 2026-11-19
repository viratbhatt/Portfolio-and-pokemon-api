import DialogShell from './DialogShell'
import { formatHeight, formatPokemonName, formatWeight, type PokemonDetail } from './model'
import { getAccentStyle, PokemonArtwork, StatList, TypeList } from './PokemonVisuals'

interface ComparePokemonDialogProps {
  pokemon: [PokemonDetail, PokemonDetail]
  shiny: boolean
  onClose: () => void
}

export default function ComparePokemonDialog({ pokemon, shiny, onClose }: ComparePokemonDialogProps) {
  return (
    <DialogShell title="Pokémon comparison" onClose={onClose} className="pokemon-comparison-dialog">
      <p className="comparison-note">Higher stat values are highlighted.</p>
      <div className="comparison-grid">
        {pokemon.map((detail, index) => {
          const other = pokemon[index === 0 ? 1 : 0]
          const primaryType = detail.types[0]?.type.name || 'normal'
          return (
            <article key={detail.name} className="comparison-column" style={getAccentStyle(primaryType)}>
              <div className="sprite-wrap comparison-artwork">
                <PokemonArtwork detail={detail} shiny={shiny} />
              </div>
              <div className="comparison-heading">
                <h3>{formatPokemonName(detail.name)}</h3>
                <span>#{detail.id}</span>
              </div>
              <TypeList types={detail.types} />
              <div className="comparison-physical">
                <span>{formatHeight(detail.height)}</span>
                <span>{formatWeight(detail.weight)}</span>
              </div>
              <StatList detail={detail} comparisonTo={other} />
            </article>
          )
        })}
      </div>
    </DialogShell>
  )
}
