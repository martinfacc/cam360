import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import ThreeScene from './three-scene.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThreeScene />
  </StrictMode>
)
