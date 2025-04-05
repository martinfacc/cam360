import { useApp } from '../contexts/app-context/hook'

export default function EnableSensorsButton() {
  const { permissionGranted, setPermissionGranted } = useApp()

  // Solicitar permiso para acceder a los sensores (requerido en iOS 13+)
  const requestPermission = () => {
    if (
      typeof DeviceOrientationEvent !== 'undefined' &&
      // @ts-expect-error no-types
      typeof DeviceOrientationEvent.requestPermission === 'function'
    ) {
      // @ts-expect-error no-types
      DeviceOrientationEvent.requestPermission()
        .then((response: 'granted' | 'denied') => {
          if (response === 'granted') {
            setPermissionGranted(true)
          }
        })
        .catch(console.error)
    } else {
      setPermissionGranted(true)
    }
  }

  if (permissionGranted) return null

  return (
    <button
      style={{
        position: 'absolute',
        zIndex: 2,
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        padding: '1rem',
        fontSize: '1.2rem',
      }}
      onClick={requestPermission}
    >
      Habilitar Sensores
    </button>
  )
}
