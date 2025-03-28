import React, { useRef, useEffect, useState } from 'react'
import * as THREE from 'three'
import { getColorFromPosition, getSphereTransforms } from './utils'

const DISTANCE = 5
const SPHERE_RADIUS = 0.3
const SPHERE_SEGMENTS = 16
const SPHERE_COUNT = 16
const SPHERE_OPACITY = 0.5

// Filtro Kalman simple para suavizar datos
class KalmanFilter {
  private R: number
  private Q: number
  private A: number
  private B: number
  private C: number
  private cov: number
  private x: number

  constructor(R: number, Q: number, A = 1, B = 0, C = 1) {
    this.R = R // Varianza del ruido en la medición
    this.Q = Q // Varianza del ruido del proceso
    this.A = A
    this.B = B
    this.C = C
    this.cov = NaN
    this.x = NaN
  }

  filter(z: number, u: number = 0): number {
    // Inicialización con la primera medición
    if (isNaN(this.x)) {
      this.x = z / this.C
      this.cov = (1 / this.C) * this.R * (1 / this.C)
    } else {
      // Predicción
      const predX = this.A * this.x + this.B * u
      const predCov = this.A * this.cov * this.A + this.Q

      // Ganancia de Kalman
      const K = (predCov * this.C) / (this.C * predCov * this.C + this.R)
      // Actualización con la medición
      this.x = predX + K * (z - this.C * predX)
      // Actualizar la covarianza
      this.cov = predCov - K * this.C * predCov
    }
    return this.x
  }
}

export default function ThreeScene() {
  const mountRef = useRef<HTMLDivElement>(null)
  const [permissionGranted, setPermissionGranted] = useState(false)
  // Estado para almacenar el offset de calibración
  const [calibrationOffset, setCalibrationOffset] = useState({ alpha: 0, beta: 0, gamma: 0 })

  // Usamos un ref para mantener la orientación filtrada actualizada
  const orientationRef = useRef({ alpha: 0, beta: 0, gamma: 0 })

  useEffect(() => {
    const mountNode = mountRef.current
    if (!mountNode) return
    if (!permissionGranted) return

    const elements: THREE.Mesh[] = []

    // Crear instancias del filtro Kalman para cada eje
    const kalmanAlpha = new KalmanFilter(0.1, 0.1)
    const kalmanBeta = new KalmanFilter(0.1, 0.1)
    const kalmanGamma = new KalmanFilter(0.1, 0.1)

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

    // Generar y añadir los puntos en la esfera
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

    // Función para manejar los eventos deviceorientation aplicando el filtro Kalman
    const handleOrientation = (event: DeviceOrientationEvent) => {
      if (event.alpha === null || event.beta === null || event.gamma === null) return

      // Convertir alpha a [0, 360) y ajustar beta y gamma
      const rawAlpha = (event.alpha + 360) % 360
      const rawBeta = Math.max(-180, Math.min(180, event.beta))
      const rawGamma = Math.max(-90, Math.min(90, event.gamma))

      // Aplicar el filtro Kalman a cada medición
      orientationRef.current.alpha = kalmanAlpha.filter(rawAlpha)
      orientationRef.current.beta = kalmanBeta.filter(rawBeta)
      orientationRef.current.gamma = kalmanGamma.filter(rawGamma)
    }

    window.addEventListener('deviceorientation', handleOrientation, true)

    // Corrección para alinear el dispositivo con la escena
    const q1 = new THREE.Quaternion(-Math.sqrt(0.5), 0, 0, Math.sqrt(0.5))

    const animate = () => {
      requestAnimationFrame(animate)

      // Obtener los valores filtrados y aplicar el offset de calibración
      const effectiveAlpha = orientationRef.current.alpha - calibrationOffset.alpha
      const effectiveBeta = orientationRef.current.beta - calibrationOffset.beta
      // Para evitar problemas con roll, usamos gamma solo si se requiere

      // Convertir a radianes
      const radAlpha = THREE.MathUtils.degToRad(effectiveAlpha)
      const radBeta = THREE.MathUtils.degToRad(effectiveBeta)

      // Crear un Euler con el orden "YXZ"
      const euler = new THREE.Euler(radBeta, radAlpha, 0, 'YXZ')
      const quaternion = new THREE.Quaternion()
      quaternion.setFromEuler(euler)

      // Aplicar la corrección fija para alinear el dispositivo con la escena
      quaternion.multiply(q1)

      // Ajustar la orientación según la pantalla
      const screenOrientationAngle =
        screen.orientation && screen.orientation.angle ? screen.orientation.angle : 0
      const screenOrientation = THREE.MathUtils.degToRad(screenOrientationAngle)
      const screenTransform = new THREE.Quaternion()
      screenTransform.setFromAxisAngle(new THREE.Vector3(0, 0, 1), -screenOrientation)
      quaternion.multiply(screenTransform)

      // Asignar el quaternion resultante a la cámara
      camera.quaternion.copy(quaternion)

      renderer.render(scene, camera)
    }

    animate()

    // Ajuste del renderer al redimensionar la ventana
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
  }, [permissionGranted, calibrationOffset])

  // Solicitar permiso para acceder a los sensores (requerido en iOS 13+)
  const requestPermission = () => {
    if (
      typeof DeviceOrientationEvent !== 'undefined' &&
      // @ts-expect-error property 'requestPermission' does not exist on type
      typeof DeviceOrientationEvent.requestPermission === 'function'
    ) {
      // @ts-expect-error property 'requestPermission' does not exist on type
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

  // Función para calibrar: se toma la orientación filtrada actual y se guarda como offset
  const calibrate = () => {
    // Se toma la referencia actual y se guarda en el estado
    setCalibrationOffset({ ...orientationRef.current })
  }

  return (
    <React.Fragment>
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
      {permissionGranted && (
        <button
          style={{
            position: 'absolute',
            zIndex: 2,
            top: '10%',
            left: '50%',
            transform: 'translateX(-50%)',
            padding: '0.8rem',
            fontSize: '1rem',
          }}
          onClick={calibrate}
        >
          Calibrar
        </button>
      )}
      <div ref={mountRef} style={{ width: '100vw', height: '100vh', overflow: 'hidden' }} />
    </React.Fragment>
  )
}
