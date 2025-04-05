import * as THREE from 'three'
import { DISTANCE, SPHERE_COUNT, SPHERE_RADIUS } from '../constants'
import { useApp } from '../contexts/app-context/hook'

export default function PhotoCaptureButton() {
  const {
    currentScene,
    currentCamera,
    permissionGranted,
    photosLeft,
    setPhotosLeft,
    setPhotoFiles,
  } = useApp()

  const removeSphereInView = (): THREE.Mesh | null => {
    if (!currentScene) {
      console.error('No hay escena actual.')
      return null
    }

    if (!currentCamera) {
      console.error('No hay cámara actual.')
      return null
    }

    let closestSphere: THREE.Mesh | null = null
    let minAngle = Infinity

    const spheres = currentScene.children.filter(
      (obj) => obj instanceof THREE.Mesh && obj.geometry instanceof THREE.SphereGeometry
    ) as THREE.Mesh[]

    const camera = currentCamera as THREE.PerspectiveCamera
    const cameraDirection = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion)

    // Calcular la punta de la línea en la dirección de la cámara con longitud DISTANCE
    const lineEnd = new THREE.Vector3()
      .copy(camera.position)
      .add(cameraDirection.multiplyScalar(DISTANCE))

    for (const sphere of spheres) {
      const sphereCenter = sphere.position
      const distanceToLineEnd = lineEnd.distanceTo(sphereCenter) // Distancia de la punta de la línea al centro de la esfera

      console.log(`Distancia a la esfera ${sphere.userData.id}:`, distanceToLineEnd)

      // Comprobar si la esfera está dentro del rango de distancia
      if (distanceToLineEnd <= SPHERE_RADIUS * 2.5) {
        const toSphere = new THREE.Vector3().subVectors(sphereCenter, camera.position).normalize()
        const angle = cameraDirection.angleTo(toSphere)

        if (angle < minAngle) {
          minAngle = angle
          closestSphere = sphere
        }
      }
    }

    if (closestSphere && currentScene.children.includes(closestSphere)) {
      currentScene.remove(closestSphere)
      console.log('Esfera eliminada:', closestSphere)
      setPhotosLeft((prev) => prev - 1)
    }

    return closestSphere
  }

  // Función para tomar foto y guardarla en estado como File
  const takePhoto = () => {
    if (!permissionGranted || !currentScene) return

    const sphere = removeSphereInView()

    if (!sphere) {
      console.error('No se encontró la esfera en la vista.')
      return
    }

    // Buscar la textura de video en la escena
    const videoTexture = currentScene.background as THREE.VideoTexture
    if (!(videoTexture instanceof THREE.VideoTexture) || !videoTexture.image) {
      console.error('No se encontró la textura de video.')
      return
    }

    const video = videoTexture.image as HTMLVideoElement
    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d')

    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
      canvas.toBlob((blob) => {
        if (blob) {
          const filename = sphere.userData.id || 'photo'
          const file = new File([blob], `${filename}.png`, { type: 'image/png' })
          setPhotoFiles((prevFiles) => [...prevFiles, file])
          console.log('Foto guardada en el estado:', file)
        } else {
          console.error('No se pudo capturar la foto.')
        }
      }, 'image/png')
    }
  }

  if (!permissionGranted || photosLeft === 0) return null

  return (
    <button
      style={{
        position: 'absolute',
        zIndex: 2,
        bottom: '2rem',
        left: '50%',
        transform: 'translateX(-50%)',
        padding: '1rem',
        fontSize: '1.2rem',
      }}
      onClick={takePhoto}
    >
      Tomar Foto ({photosLeft}/{SPHERE_COUNT})
    </button>
  )
}
