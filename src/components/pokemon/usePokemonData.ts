import { useEffect, useMemo, useRef, useState } from 'react'
import {
  fetchJson,
  fetchPokemonDetail,
  isCompleteDetail,
  POKEMON_API_URL,
  type PokemonDetail,
  type PokemonSummary,
} from './model'

const CACHE_KEY = 'pokemon-details-cache'

type TypeResponse = {
  pokemon: { pokemon: PokemonSummary }[]
}

function readDetailCache(): Record<string, PokemonDetail> {
  try {
    const stored = localStorage.getItem(CACHE_KEY)
    if (!stored) return {}
    const parsed = JSON.parse(stored) as { entries?: Record<string, PokemonDetail> } | Record<string, PokemonDetail>
    const entries = 'entries' in parsed ? parsed.entries ?? {} : parsed
    return Object.fromEntries(Object.entries(entries).filter(([, detail]) => isCompleteDetail(detail)))
  } catch {
    return {}
  }
}

export function usePokemonCatalog(selectedType: string) {
  const [catalog, setCatalog] = useState<PokemonSummary[]>([])
  const [typeMembers, setTypeMembers] = useState<string[] | undefined>()
  const [catalogLoading, setCatalogLoading] = useState(true)
  const [typeLoading, setTypeLoading] = useState(false)
  const [error, setError] = useState('')
  const typeCache = useRef<Record<string, string[]>>({})

  useEffect(() => {
    const controller = new AbortController()

    async function loadCatalog() {
      setCatalogLoading(true)
      setError('')
      try {
        const data = await fetchJson<{ results: PokemonSummary[] }>(
          `${POKEMON_API_URL}/pokemon?limit=1000`,
          controller.signal,
        )
        if (!controller.signal.aborted) setCatalog(data.results)
      } catch {
        if (!controller.signal.aborted) setError('Failed to load the Pokémon catalog. Please refresh to try again.')
      } finally {
        if (!controller.signal.aborted) setCatalogLoading(false)
      }
    }

    void loadCatalog()
    return () => controller.abort()
  }, [])

  useEffect(() => {
    if (selectedType === 'all') {
      setTypeMembers(undefined)
      setTypeLoading(false)
      return
    }

    const cached = typeCache.current[selectedType]
    if (cached) {
      setTypeMembers(cached)
      setTypeLoading(false)
      return
    }

    const controller = new AbortController()
    setTypeMembers(undefined)
    setTypeLoading(true)
    setError('')

    async function loadType() {
      try {
        const data = await fetchJson<TypeResponse>(
          `${POKEMON_API_URL}/type/${selectedType}`,
          controller.signal,
        )
        const names = data.pokemon.map((entry) => entry.pokemon.name)
        typeCache.current[selectedType] = names
        if (!controller.signal.aborted) setTypeMembers(names)
      } catch {
        if (!controller.signal.aborted) setError(`Failed to load ${selectedType}-type Pokémon. Please try another type or retry.`)
      } finally {
        if (!controller.signal.aborted) setTypeLoading(false)
      }
    }

    void loadType()
    return () => controller.abort()
  }, [selectedType])

  const sourceSummaries = useMemo(() => {
    if (selectedType === 'all') return catalog
    if (!typeMembers) return []
    const members = new Set(typeMembers)
    return catalog.filter((pokemon) => members.has(pokemon.name))
  }, [catalog, selectedType, typeMembers])

  return {
    sourceSummaries,
    loading: catalogLoading || typeLoading,
    error,
  }
}

export function usePokemonDetails(visiblePokemon: PokemonSummary[]) {
  const [details, setDetails] = useState<Record<string, PokemonDetail>>(readDetailCache)
  const [failedNames, setFailedNames] = useState<Record<string, boolean>>({})
  const [retryVersion, setRetryVersion] = useState(0)
  const [loadingDetails, setLoadingDetails] = useState(false)
  const visibleKey = visiblePokemon.map((pokemon) => pokemon.name).sort().join(',')

  useEffect(() => {
    const missing = visiblePokemon.filter((pokemon) => !isCompleteDetail(details[pokemon.name]))
    if (missing.length === 0) {
      setLoadingDetails(false)
      return
    }

    const controller = new AbortController()
    setLoadingDetails(true)
    setFailedNames((current) => {
      const next = { ...current }
      for (const pokemon of missing) delete next[pokemon.name]
      return next
    })

    async function loadDetails() {
      const results = await Promise.allSettled(
        missing.map((pokemon) => fetchPokemonDetail(pokemon.url, controller.signal)),
      )
      if (controller.signal.aborted) return

      const loaded: PokemonDetail[] = []
      const failed: Record<string, boolean> = {}
      results.forEach((result, index) => {
        if (result.status === 'fulfilled') loaded.push(result.value)
        else failed[missing[index].name] = true
      })

      if (loaded.length) {
        setDetails((current) => {
          const next = { ...current }
          for (const detail of loaded) next[detail.name] = detail
          return next
        })
      }
      setFailedNames((current) => ({ ...current, ...failed }))
      setLoadingDetails(false)
    }

    void loadDetails()
    return () => controller.abort()
    // The key represents the current page; retryVersion explicitly reloads failed details.
  }, [visibleKey, retryVersion])

  useEffect(() => {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify({ version: 2, entries: details }))
    } catch {
      // Storage is optional; the in-memory cache still works.
    }
  }, [details])

  function retryDetails(name: string) {
    setFailedNames((current) => {
      const next = { ...current }
      delete next[name]
      return next
    })
    setRetryVersion((current) => current + 1)
  }

  return { details, failedNames, loadingDetails, retryDetails }
}
