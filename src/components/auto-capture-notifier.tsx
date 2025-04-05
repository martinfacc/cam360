import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { useApp } from '../contexts/app-context/hook'

export default function AutoCaptureNotifier() {
  const {
    currentScene,
    currentCamera,
    rendererRef,
    overSphere,
    setOverSphere,
    setPhotosLeft,
    setPhotoFiles,
  } = useApp()
  const overStartTimeRef = useRef<number | null>(null)
  const lastIntersectedIdRef = useRef<string | null>(null)

  useEffect(() => {
    if (!currentScene || !currentCamera || !rendererRef.current) return

    const raycaster = new THREE.Raycaster()
    const center = new THREE.Vector2(0, 0)

    const checkIntersection = () => {
      raycaster.setFromCamera(center, currentCamera)
      const intersects = raycaster.intersectObjects(currentScene.children, true)

      if (intersects.length > 0) {
        const intersectedObject = intersects[0].object
        const sphereId = intersectedObject.userData.id

        if (sphereId) {
          if (lastIntersectedIdRef.current !== sphereId) {
            // Nueva esfera: resetear el temporizador
            overStartTimeRef.current = performance.now()
            lastIntersectedIdRef.current = sphereId
            setOverSphere(true)
          } else {
            // Misma esfera: verificar cuánto tiempo lleva encima
            const elapsed = performance.now() - (overStartTimeRef.current ?? 0)
            if (elapsed >= 1000) {
              takePhoto(sphereId)
              overStartTimeRef.current = null
              lastIntersectedIdRef.current = null
              setOverSphere(false)
            }
          }
        }
      } else {
        // No hay intersección, reiniciar todo
        if (overSphere) {
          setOverSphere(false)
        }
        overStartTimeRef.current = null
        lastIntersectedIdRef.current = null
      }

      requestAnimationFrame(checkIntersection)
    }

    const takePhoto = (sphereId: string) => {
      const renderer = rendererRef.current
      if (!renderer) return

      const spheres: THREE.Mesh[] = currentScene.children.filter(
        (obj) => obj instanceof THREE.Mesh && obj.geometry instanceof THREE.SphereGeometry
      ) as THREE.Mesh[]

      const sphere = spheres.find((s) => s.userData.id === sphereId)
      if (sphere) {
        currentScene.remove(sphere)
        setPhotosLeft((prev) => prev - 1)

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
    }

    requestAnimationFrame(checkIntersection)

    return () => {
      overStartTimeRef.current = null
      lastIntersectedIdRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentScene, currentCamera, rendererRef, overSphere])

  return (
    <div style={{ position: 'absolute', top: 10, left: 10, color: 'white', zIndex: 10 }}>
      {overSphere && <div>¡Estás sobre una esfera!</div>}
    </div>
  )
}
