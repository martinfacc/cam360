import React, { useState, useEffect, useRef } from 'react'
import * as THREE from 'three'

const App: React.FC = () => {
  const [started, setStarted] = useState(false)
  const logElement = useRef<HTMLDivElement | null>(null)
  const startButtonRef = useRef<HTMLButtonElement | null>(null)

  const sceneRef = useRef<THREE.Scene | null>(null)
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null)
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
  const planeRef = useRef<THREE.Mesh | null>(null)

  const startSensors = () => {
    window.addEventListener('deviceorientation', handleOrientation, true)
    window.addEventListener('devicemotion', handleMotion, true)
  }

  const handleOrientation = (event: DeviceOrientationEvent) => {
    const alpha = event.alpha ?? 0
    const beta = event.beta ?? 0
    const gamma = event.gamma ?? 0

    if (logElement.current) {
      logElement.current.textContent = `Alpha: ${alpha.toFixed(
        2
      )}°\nBeta: ${beta.toFixed(2)}°\nGamma: ${gamma.toFixed(2)}°`
    }

    if (started && cameraRef.current) {
      cameraRef.current.rotation.set(
        THREE.MathUtils.degToRad(beta),
        THREE.MathUtils.degToRad(gamma),
        THREE.MathUtils.degToRad(alpha)
      )
    }
  }

  const handleMotion = (event: DeviceMotionEvent) => {
    const acceleration = event.acceleration
    if (acceleration && logElement.current) {
      logElement.current.textContent = `Acc. X: ${acceleration.x?.toFixed(
        2
      )}\nAcc. Y: ${acceleration.y?.toFixed(2)}\nAcc. Z: ${acceleration.z?.toFixed(2)}`
    }
  }

  const initThree = () => {
    sceneRef.current = new THREE.Scene()
    cameraRef.current = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    )
    rendererRef.current = new THREE.WebGLRenderer()
    rendererRef.current.setSize(window.innerWidth, window.innerHeight)
    document.body.appendChild(rendererRef.current.domElement)

    // Crear el plano rojo
    const geometry = new THREE.PlaneGeometry(5, 5)
    const material = new THREE.MeshBasicMaterial({ color: 0xff0000 })
    planeRef.current = new THREE.Mesh(geometry, material)
    sceneRef.current.add(planeRef.current)

    cameraRef.current.position.z = 10
  }

  const animate = () => {
    if (started && rendererRef.current && sceneRef.current && cameraRef.current) {
      requestAnimationFrame(animate)
      rendererRef.current.render(sceneRef.current, cameraRef.current)
    }
  }

  const handleStart = async () => {
    // Verificar si estamos en un dispositivo Apple
    // @ts-expect-error faltan las definiciones de tipos
    if (typeof DeviceOrientationEvent !== 'undefined' && DeviceOrientationEvent.requestPermission) {
      // @ts-expect-error faltan las definiciones de tipos
      const permission = await DeviceOrientationEvent.requestPermission()
      if (permission !== 'granted') {
        alert('Se necesita permiso para acceder al giroscopio. Por favor, acepta la solicitud.')
        return
      }
    }

    setStarted(true)
    if (startButtonRef.current) {
      startButtonRef.current.style.display = 'none'
    }
    if (logElement.current) {
      logElement.current.textContent = 'Capturando datos...'
    }
    startSensors()
    animate()
  }

  useEffect(() => {
    initThree()
  }, [])

  return (
    <div>
      <div
        ref={logElement}
        style={{
          position: 'absolute',
          top: 10,
          left: 10,
          color: 'white',
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          padding: '10px',
          fontSize: '16px',
          zIndex: 10,
        }}
      >
        Esperando... (no se capturan datos aún)
      </div>
      <button
        ref={startButtonRef}
        onClick={handleStart}
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          padding: '10px 20px',
          fontSize: '18px',
          backgroundColor: '#ff5733',
          color: 'white',
          border: 'none',
          cursor: 'pointer',
          zIndex: 10,
        }}
      >
        Comenzar
      </button>
    </div>
  )
}

export default App
