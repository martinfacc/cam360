import { useApp } from '../contexts/app-context/hook'

export default function FocusRing() {
  const { permissionGranted } = useApp()

  if (!permissionGranted) return null

  return (
    <div
      style={{
        position: 'absolute',
        zIndex: 2,
        top: '50%',
        left: '50%',
        width: '75px',
        height: '75px',
        marginLeft: '-75px',
        marginTop: '-75px',
        border: '4px solid rgba(255, 255, 255, 0.8)',
        borderRadius: '50%',
        pointerEvents: 'none',
      }}
    />
  )
}
