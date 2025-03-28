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

  useEffect(() => {
    const mountNode = mountRef.current
    if (!mountNode) return
    if (!permissionGranted) return

    const elements: THREE.Object3D[] = []

    // Variables para el acumulado y la última lectura de cada ángulo
    const lastAngles: { alpha: number | null; beta: number | null; gamma: number | null } = {
      alpha: null,
      beta: null,
      gamma: null,
    }
    const accumulatedAngles = { alpha: 0, beta: 0, gamma: 0 }
    const smoothingFactor = 0.1

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

    // Configurar el feed de la cámara trasera como fondo
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

    // Función para actualizar el ángulo de forma acumulada y con suavizado
    const updateAxis = (axis: 'alpha' | 'beta' | 'gamma', newValue: number) => {
      if (lastAngles[axis] === null) {
        // Primera lectura: inicializamos
        lastAngles[axis] = newValue
        accumulatedAngles[axis] = newValue
        return
      }
      let delta = newValue - lastAngles[axis]!
      // Manejo de discontinuidad (por ejemplo, de 359 a 0)
      if (delta > 180) delta -= 360
      else if (delta < -180) delta += 360

      // Actualización: se suma el delta y se suaviza la transición
      const newAccumulated = accumulatedAngles[axis] + delta
      accumulatedAngles[axis] =
        accumulatedAngles[axis] * (1 - smoothingFactor) + newAccumulated * smoothingFactor

      lastAngles[axis] = newValue
    }

    // Función para manejar los eventos deviceorientation
    const handleOrientation = (event: DeviceOrientationEvent) => {
      if (event.alpha === null || event.beta === null || event.gamma === null) return

      // Actualizamos cada eje con el nuevo valor del sensor
      updateAxis('alpha', (event.alpha + 360) % 360) // alpha siempre entre 0 y 360
      updateAxis('beta', Math.max(-180, Math.min(180, event.beta)))
      updateAxis('gamma', Math.max(-90, Math.min(90, event.gamma)))
    }

    window.addEventListener('deviceorientation', handleOrientation, true)

    // Corrección fija para alinear el dispositivo con la escena
    const q1 = new THREE.Quaternion(-Math.sqrt(0.5), 0, 0, Math.sqrt(0.5))

    const animate = () => {
      requestAnimationFrame(animate)

      // Convertir los ángulos acumulados a radianes
      const alphaRad = THREE.MathUtils.degToRad(accumulatedAngles.alpha)
      const betaRad = THREE.MathUtils.degToRad(accumulatedAngles.beta)
      const gammaRad = THREE.MathUtils.degToRad(accumulatedAngles.gamma)

      // Crear un Euler que incluya los tres ángulos, en el orden "YXZ"
      const euler = new THREE.Euler(betaRad, alphaRad, gammaRad, 'YXZ')
      const quaternion = new THREE.Quaternion().setFromEuler(euler)

      // Aplicar la corrección fija
      quaternion.multiply(q1)

      // Ajustar según la orientación de la pantalla
      const screenOrientationAngle =
        screen.orientation && screen.orientation.angle ? screen.orientation.angle : 0
      const screenOrientation = THREE.MathUtils.degToRad(screenOrientationAngle)
      const screenTransform = new THREE.Quaternion().setFromAxisAngle(
        new THREE.Vector3(0, 0, 1),
        -screenOrientation
      )
      quaternion.multiply(screenTransform)

      // Asignar el quaternion resultante a la cámara
      camera.quaternion.copy(quaternion)

      renderer.render(scene, camera)
    }

    animate()

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
      // @ts-expect-error UNX
      typeof DeviceOrientationEvent.requestPermission === 'function'
    ) {
      // @ts-expect-error UNX
      DeviceOrientationEvent.requestPermission()
        .then((response: 'granted' | 'denied') => {
          if (response === 'granted') {
            setPermissionGranted(true)
          }
        })
        .catch(console.error)
    } else {
      // En otros dispositivos se puede acceder directamente
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
      <div ref={mountRef} style={{ width: '100vw', height: '100vh', overflow: 'hidden' }} />
    </React.Fragment>
  )
}
