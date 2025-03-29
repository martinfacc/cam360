import { useRef, useEffect, useState } from 'react'
import * as THREE from 'three'
import { getColorFromPosition, getSphereTransforms } from './utils'

const DISTANCE = 5
const SPHERE_RADIUS = 0.3
const SPHERE_SEGMENTS = 16
const SPHERE_COUNT = 16
const SPHERE_OPACITY = 0.5

export default function ThreeScene() {
  const mountRef = useRef<HTMLDivElement>(null)
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
  const [permissionGranted, setPermissionGranted] = useState(false)
  const [photoFiles, setPhotoFiles] = useState<File[]>([])

  useEffect(() => {
    const mountNode = mountRef.current
    if (!mountNode) return
    if (!permissionGranted) return

    // Crear la escena y la cámara
    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(
      75,
      mountNode.clientWidth / mountNode.clientHeight,
      0.1,
      1000
    )
    camera.position.set(0, 0, 0)

    // Configurar el renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setSize(mountNode.clientWidth, mountNode.clientHeight)
    mountNode.appendChild(renderer.domElement)
    rendererRef.current = renderer

    // Agregar esferas
    const sphereTransforms = getSphereTransforms(DISTANCE, SPHERE_COUNT)
    sphereTransforms.forEach((cfg) => {
      const geometry = new THREE.SphereGeometry(SPHERE_RADIUS, SPHERE_SEGMENTS, SPHERE_SEGMENTS)
      const color = getColorFromPosition(cfg.pos)
      const material = new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: SPHERE_OPACITY,
      })
      const sphere = new THREE.Mesh(geometry, material)
      sphere.position.set(...cfg.pos)
      sphere.rotation.set(...cfg.rot)
      scene.add(sphere)
    })

    // Agregar video de fondo de la cámara
    const video = document.createElement('video')
    video.autoplay = true
    video.playsInline = true
    video.muted = true
    navigator.mediaDevices
      .getUserMedia({
        video: { facingMode: { exact: 'environment' } },
      })
      .then((stream) => {
        video.srcObject = stream
        video.play()
        const videoTexture = new THREE.VideoTexture(video)
        videoTexture.minFilter = THREE.LinearFilter
        videoTexture.magFilter = THREE.LinearFilter
        videoTexture.format = THREE.RGBFormat
        scene.background = videoTexture
      })
      .catch((err) => {
        console.error('Error al acceder a la cámara:', err)
      })

    // Configurar la orientación del dispositivo
    let alpha = 0,
      beta = 0,
      gamma = 0

    const euler = new THREE.Euler()
    const deviceQuaternion = new THREE.Quaternion()
    // Corrección para alinear el sistema de referencia del dispositivo con three.js
    const q1 = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 2)

    const handleOrientation = (event: DeviceOrientationEvent) => {
      if (event.alpha === null || event.beta === null || event.gamma === null) return

      alpha = THREE.MathUtils.degToRad(event.alpha)
      beta = THREE.MathUtils.degToRad(event.beta)
      gamma = THREE.MathUtils.degToRad(event.gamma)

      // Se utiliza el orden 'YXZ' para evitar efectos inesperados
      euler.set(beta, alpha, -gamma, 'YXZ')
      deviceQuaternion.setFromEuler(euler)
      deviceQuaternion.multiply(q1)
      camera.quaternion.copy(deviceQuaternion)
    }

    window.addEventListener('deviceorientation', handleOrientation, true)

    // Loop de animación
    const animate = () => {
      requestAnimationFrame(animate)
      renderer.render(scene, camera)
    }
    animate()

    // Ajustar el tamaño al redimensionar
    const onWindowResize = () => {
      if (!mountNode) return
      camera.aspect = mountNode.clientWidth / mountNode.clientHeight
      camera.updateProjectionMatrix()
      renderer.setSize(mountNode.clientWidth, mountNode.clientHeight)
    }
    window.addEventListener('resize', onWindowResize)

    return () => {
      window.removeEventListener('deviceorientation', handleOrientation, true)
      window.removeEventListener('resize', onWindowResize)
      if (mountNode && renderer.domElement) {
        mountNode.removeChild(renderer.domElement)
      }
    }
  }, [permissionGranted])

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

  // Función para tomar foto y guardarla en estado como File
  const takePhoto = () => {
    if (rendererRef.current) {
      rendererRef.current.domElement.toBlob((blob) => {
        if (blob) {
          const file = new File([blob], 'photo.png', { type: blob.type })
          setPhotoFiles((prevFiles) => [...prevFiles, file])
          console.log('Foto guardada en el estado:', file)
        } else {
          console.error('No se pudo capturar la foto.')
        }
      }, 'image/png')
    }
  }

  // Función para descargar las fotos
  const downloadPhotos = () => {
    photoFiles.forEach((file) => {
      const url = URL.createObjectURL(file)
      const a = document.createElement('a')
      a.href = url
      a.download = file.name
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    })
  }

  return (
    <>
      {/* Botón para solicitar permisos */}
      {!permissionGranted && (
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
      )}

      {/* Botón para tomar foto (solo se muestra si ya se tienen permisos) */}
      {permissionGranted && (
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
          Tomar Foto
        </button>
      )}

      {photoFiles.length > 0 && (
        <button
          style={{
            position: 'absolute',
            zIndex: 2,
            bottom: '2rem',
            right: '2rem',
            padding: '1rem',
            fontSize: '1.2rem',
          }}
          onClick={downloadPhotos}
        >
          Descargar Fotos
        </button>
      )}

      {/* Aro central para composición */}
      {permissionGranted && (
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
      )}

      {/* Contenedor del renderer */}
      <div ref={mountRef} style={{ width: '100vw', height: '100vh', overflow: 'hidden' }} />
    </>
  )
}
