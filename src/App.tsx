import { Routes, Route } from 'react-router-dom'
import Pokemon from './components/Pokemon'
import PokemonGame from './components/PokemonGame'
import Home from './components/Home'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/pokemon" element={<Pokemon />} />
      <Route path="/pokemonGame" element={<PokemonGame />} />
    </Routes>
  )
}
