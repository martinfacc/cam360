import React, { useRef, useEffect, useState } from 'react'
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

  // Referencia para almacenar el offset de calibración
  const calibrationRef = useRef({ alpha: 0, beta: 0, gamma: 0 })

  // Objeto para guardar los últimos datos de orientación
  const orientationData = useRef({ alpha: 0, beta: 0, gamma: 0 })

  // Función para calibrar: se almacena la lectura actual como offset
  const handleCalibrate = () => {
    calibrationRef.current = {
      alpha: orientationData.current.alpha,
      beta: orientationData.current.beta,
      gamma: orientationData.current.gamma,
    }
    console.log('Calibrado:', calibrationRef.current)
  }

  useEffect(() => {
    const mountNode = mountRef.current
    if (!mountNode) return
    if (!permissionGranted) return

    const elements: THREE.Mesh[] = []

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

    // Generar los puntos en la esfera
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
      elements.push(sphere)
    })

    // Configurar el feed de la cámara trasera y usarlo como fondo
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

    // Función para manejar los eventos deviceorientation
    const handleOrientation = (event: DeviceOrientationEvent) => {
      orientationData.current.alpha = event.alpha !== null ? (event.alpha + 360) % 360 : 0
      orientationData.current.beta =
        event.beta !== null ? Math.max(-180, Math.min(180, event.beta)) : 0
      orientationData.current.gamma =
        event.gamma !== null ? Math.max(-90, Math.min(90, event.gamma)) : 0
    }
    window.addEventListener('deviceorientation', handleOrientation, true)

    // Corrección fija para alinear el dispositivo con la escena
    const q1 = new THREE.Quaternion(-Math.sqrt(0.5), 0, 0, Math.sqrt(0.5))

    const animate = () => {
      requestAnimationFrame(animate)

      // Aplicamos la calibración: restamos el offset a la lectura actual
      const calibratedAlpha =
        (orientationData.current.alpha - calibrationRef.current.alpha + 360) % 360
      const calibratedBeta = orientationData.current.beta - calibrationRef.current.beta
      // Ignoramos gamma para evitar roll no deseado

      // Convertir a radianes
      const alphaRad = THREE.MathUtils.degToRad(calibratedAlpha)
      const betaRad = THREE.MathUtils.degToRad(calibratedBeta)

      // Creamos un Euler con el orden "YXZ"
      const euler = new THREE.Euler(betaRad, alphaRad, 0, 'YXZ')
      const quaternion = new THREE.Quaternion()
      quaternion.setFromEuler(euler)

      // Aplicamos la corrección fija
      quaternion.multiply(q1)

      // Ajustamos según la orientación de la pantalla
      const screenOrientationAngle =
        screen.orientation && screen.orientation.angle ? screen.orientation.angle : 0
      const screenOrientation = THREE.MathUtils.degToRad(screenOrientationAngle)
      const screenTransform = new THREE.Quaternion()
      screenTransform.setFromAxisAngle(new THREE.Vector3(0, 0, 1), -screenOrientation)
      quaternion.multiply(screenTransform)

      // Asignamos el quaternion resultante a la cámara
      camera.quaternion.copy(quaternion)

      renderer.render(scene, camera)
    }
    animate()

    // Actualizar tamaño al redimensionar
    const onWindowResize = () => {
      const mountNode = mountRef.current
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
    <React.Fragment>
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
      {permissionGranted && (
        <button
          style={{
            position: 'absolute',
            zIndex: 1,
            top: '10%',
            right: '10%',
            padding: '0.5rem',
            fontSize: '1rem',
          }}
          onClick={handleCalibrate}
        >
          Calibrar
        </button>
      )}
      <div ref={mountRef} style={{ width: '100vw', height: '100vh', overflow: 'hidden' }} />
    </React.Fragment>
  )
}
