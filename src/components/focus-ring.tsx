import { useState, useEffect } from 'react'
import { useApp } from '../contexts/app-context/hook'

export default function FocusRing() {
  const { permissionGranted, overSphere } = useApp()
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    // eslint-disable-next-line
    let timer: any
    if (overSphere) {
      setProgress(0)
      const start = Date.now()
      timer = setInterval(() => {
        const elapsed = Date.now() - start
        const newProgress = Math.min(elapsed / 1000, 1)
        setProgress(newProgress)
        if (newProgress === 1) {
          clearInterval(timer)
        }
      }, 16) // Se actualiza aproximadamente a 60fps
    } else {
      setProgress(0)
    }
    return () => clearInterval(timer)
  }, [overSphere])

  if (!permissionGranted) return null

  return (
    <div
      style={{
        position: 'absolute',
        zIndex: 2,
        top: 'calc(50% + 37.5px)',
        left: 'calc(50% + 37.5px)',
        width: '75px',
        height: '75px',
        marginLeft: '-75px',
        marginTop: '-75px',
        borderRadius: '50%',
        pointerEvents: 'none',
        // Cuando overSphere es false, se usa el borde blanco semitransparente.
        border: '4px solid rgba(255, 255, 255, 0.8)',
        // Cuando overSphere es true, se muestra el gradiente que "llena" el anillo.
        background: overSphere
          ? `conic-gradient(#00ff00 ${progress * 360}deg, transparent ${progress * 360}deg 360deg)`
          : 'transparent',
      }}
    >
      {overSphere && (
        // Círculo interior para crear el efecto de aro (anillo) con grosor de 4px.
        <div
          style={{
            position: 'absolute',
            top: '4px',
            left: '4px',
            right: '4px',
            bottom: '4px',
            borderRadius: '50%',
            backgroundColor: 'transparent', // O el color de fondo que requieras
          }}
        />
      )}
    </div>
  )
}
