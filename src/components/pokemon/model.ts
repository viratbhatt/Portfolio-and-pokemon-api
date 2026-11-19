export const POKEMON_API_URL = 'https://pokeapi.co/api/v2'
export const MAX_STAT_VALUE = 255
export const DETAIL_CACHE_VERSION = 1

export const POKEMON_TYPES = [
  'normal', 'fire', 'water', 'electric', 'grass', 'ice', 'fighting', 'poison',
  'ground', 'flying', 'psychic', 'bug', 'rock', 'ghost', 'dragon', 'dark', 'steel', 'fairy',
] as const

export const TYPE_COLORS: Record<string, string> = {
  normal: '#52657a',
  fire: '#c24135',
  water: '#2563a9',
  electric: '#8a6500',
  grass: '#237a46',
  ice: '#167487',
  fighting: '#b32838',
  poison: '#8542a5',
  ground: '#9a5b20',
  flying: '#3973a8',
  psychic: '#bd356f',
  bug: '#617a16',
  rock: '#75664d',
  ghost: '#655487',
  dragon: '#6747b8',
  dark: '#3f3b49',
  steel: '#536774',
  fairy: '#b64b83',
}

export interface PokemonSummary {
  name: string
  url: string
}

export interface PokemonStat {
  base_stat: number
  stat: { name: string }
}

export interface PokemonDetail {
  id: number
  name: string
  height: number
  weight: number
  sprites: {
    front_default: string | null
    front_shiny?: string | null
    other?: {
      showdown?: { front_default?: string | null; front_shiny?: string | null }
      dream_world?: { front_default?: string | null }
      'official-artwork'?: { front_default?: string | null; front_shiny?: string | null }
    }
  }
  types: { type: { name: string } }[]
  stats: PokemonStat[]
  abilities?: { ability: { name: string }; is_hidden: boolean }[]
  cries?: { latest?: string | null; legacy?: string | null }
  species?: { name: string; url: string }
  featureVersion?: number
}

export interface EvolutionNode {
  species: PokemonSummary
  evolves_to: EvolutionNode[]
}

export type SortOption = 'id' | 'name' | 'hp' | 'attack' | 'speed'

export async function fetchJson<T>(url: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(url, { signal })
  if (!response.ok) throw new Error(`PokéAPI request failed (${response.status}).`)
  return response.json() as Promise<T>
}

export async function fetchPokemonDetail(url: string, signal?: AbortSignal): Promise<PokemonDetail> {
  const detail = await fetchJson<PokemonDetail>(url, signal)
  return { ...detail, featureVersion: DETAIL_CACHE_VERSION }
}

export function isCompleteDetail(detail?: PokemonDetail): detail is PokemonDetail {
  return detail?.featureVersion === DETAIL_CACHE_VERSION
}

export function getPokemonId(pokemon: PokemonSummary): number {
  const match = pokemon.url.match(/\/(\d+)\/?$/)
  return match ? Number(match[1]) : 0
}

export function getTypeColor(type: string): string {
  return TYPE_COLORS[type] || '#64748b'
}

export function formatPokemonName(name: string): string {
  return name
    .split('-')
    .map((part) => part ? part[0].toUpperCase() + part.slice(1) : '')
    .join(' ')
}

export function getArtworkCandidates(detail: PokemonDetail, shiny = false): string[] {
  const { sprites } = detail
  const official = sprites.other?.['official-artwork']
  const normal = [
    official?.front_default,
    sprites.other?.dream_world?.front_default,
    sprites.other?.showdown?.front_default,
    sprites.front_default,
  ]
  const candidates = shiny
    ? [official?.front_shiny, sprites.front_shiny, sprites.other?.showdown?.front_shiny, ...normal]
    : normal

  return [...new Set(candidates.filter((url): url is string => Boolean(url)))]
}

export function getStat(detail: PokemonDetail, name: string): number {
  return detail.stats.find((stat) => stat.stat.name === name)?.base_stat ?? 0
}

export function formatHeight(height: number): string {
  return `${(height / 10).toFixed(1)} m`
}

export function formatWeight(weight: number): string {
  return `${(weight / 10).toFixed(1)} kg`
}
