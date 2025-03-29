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
  const [permissionGranted, setPermissionGranted] = useState(false)

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

    // Variables para almacenar los ángulos convertidos a radianes
    let alpha = 0,
      beta = 0,
      gamma = 0

    // Objetos auxiliares para la conversión a quaternion
    const euler = new THREE.Euler()
    const deviceQuaternion = new THREE.Quaternion()
    // q1 corrige la diferencia entre el sistema de referencia del dispositivo y el de three.js
    const q1 = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 2)

    // Función para manejar la orientación del dispositivo
    const handleOrientation = (event: DeviceOrientationEvent) => {
      if (event.alpha === null || event.beta === null || event.gamma === null) return

      // Convertir los ángulos a radianes
      alpha = THREE.MathUtils.degToRad(event.alpha)
      beta = THREE.MathUtils.degToRad(event.beta)
      gamma = THREE.MathUtils.degToRad(event.gamma)

      // Se utiliza el orden 'YXZ' para evitar efectos inesperados
      euler.set(beta, alpha, -gamma, 'YXZ')
      deviceQuaternion.setFromEuler(euler)
      // Aplicar corrección para alinear con el mundo three.js
      deviceQuaternion.multiply(q1)
      // Actualizar la orientación de la cámara usando el quaternion calculado
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

  return (
    <>
      {!permissionGranted && (
        <button
          style={{
            position: 'absolute',
            zIndex: 1,
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
      <div ref={mountRef} style={{ width: '100vw', height: '100vh', overflow: 'hidden' }} />
    </>
  )
}
