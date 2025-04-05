import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import ThreeScene from './three-scene.tsx'
import { AppProvider } from './contexts/app-context/provider.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppProvider>
      <ThreeScene />
    </AppProvider>
  </StrictMode>
)
