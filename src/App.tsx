'use client'
import { useRef, useState } from 'react'
import * as THREE from 'three'

const GyroScene = () => {
  const mountRef = useRef<HTMLDivElement>(null)
  const startButtonRef = useRef<HTMLButtonElement>(null)
  const logElement = useRef<HTMLDivElement>(null)
  const [started, setStarted] = useState(false)
  let scene: THREE.Scene
  let camera: THREE.PerspectiveCamera
  let renderer: THREE.WebGLRenderer
  let alpha = 0,
    beta = 0,
    gamma = 0
  let prevAlpha = 0,
    prevBeta = 0,
    prevGamma = 0

  // Inicializar escena
  const init = () => {
    scene = new THREE.Scene()
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000)
    renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setSize(window.innerWidth, window.innerHeight)
    mountRef.current?.appendChild(renderer.domElement)

    // Crear planos de diferentes colores en las seis direcciones
    const positions: Array<{
      pos: [number, number, number]
      rot: [number, number, number]
      color: string
    }> = [
      { pos: [0, 0, -5], rot: [0, 0, 0], color: 'red' }, // Adelante
      { pos: [0, 0, 5], rot: [0, Math.PI, 0], color: 'blue' }, // Atrás
      { pos: [0, 5, 0], rot: [-Math.PI / 2, 0, 0], color: 'green' }, // Arriba
      { pos: [0, -5, 0], rot: [Math.PI / 2, 0, 0], color: 'yellow' }, // Abajo
      { pos: [-5, 0, 0], rot: [0, Math.PI / 2, 0], color: 'purple' }, // Izquierda
      { pos: [5, 0, 0], rot: [0, -Math.PI / 2, 0], color: 'orange' }, // Derecha
    ]

    positions.forEach(({ pos, rot, color }) => {
      const geometry = new THREE.PlaneGeometry(2, 2)
      const material = new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide })
      const plane = new THREE.Mesh(geometry, material)
      plane.position.set(...pos)
      plane.rotation.set(...rot)
      scene.add(plane)
    })

    camera.position.set(0, 0, 0) // Cámara en el centro

    window.addEventListener('resize', onWindowResize)
  }

  // Ajustar tamaño en cambio de ventana
  const onWindowResize = () => {
    camera.aspect = window.innerWidth / window.innerHeight
    camera.updateProjectionMatrix()
    renderer.setSize(window.innerWidth, window.innerHeight)
  }

  // Capturar datos del giroscopio y actualizar la orientación de la cámara
  const startSensors = () => {
    window.addEventListener('deviceorientation', (event) => {
      // Tomar solo valores enteros
      alpha = Math.floor(event.alpha ?? 0)
      beta = Math.floor(event.beta ?? 0)
      gamma = Math.floor(event.gamma ?? 0)

      if (logElement.current) {
        logElement.current.textContent = `alpha: ${alpha}, beta: ${beta}, gamma: ${gamma}`
      }

      // Suavizar y corregir saltos en alpha, beta y gamma
      if (Math.abs(alpha - prevAlpha) > 180) {
        alpha = prevAlpha + (alpha > 0 ? -360 : 360) // Corregir el salto de 360 grados
      }
      if (Math.abs(beta - prevBeta) > 90) {
        beta = prevBeta + (beta > 0 ? -180 : 180) // Corregir el salto de 180 grados
      }
      if (Math.abs(gamma - prevGamma) > 90) {
        gamma = prevGamma + (gamma > 0 ? -180 : 180) // Corregir el salto de 180 grados
      }

      // Actualizar los valores previos
      prevAlpha = alpha
      prevBeta = beta
      prevGamma = gamma

      // Convertir los valores a radianes
      const rotation = new THREE.Euler(
        THREE.MathUtils.degToRad(beta),
        THREE.MathUtils.degToRad(gamma),
        THREE.MathUtils.degToRad(alpha),
        'XYZ'
      )

      // Aplicar la rotación al cámara
      camera.rotation.x = rotation.x
      camera.rotation.y = rotation.y
      camera.rotation.z = rotation.z
    })
  }

  // Animación
  const animate = () => {
    requestAnimationFrame(animate)
    renderer.render(scene, camera)
  }

  // Manejar inicio con permisos
  const handleStart = async () => {
    // @ts-expect-error no types
    if (typeof DeviceOrientationEvent !== 'undefined' && DeviceOrientationEvent.requestPermission) {
      // @ts-expect-error no types
      const permission = await DeviceOrientationEvent.requestPermission()
      if (permission !== 'granted') {
        alert('Se necesita permiso para acceder al giroscopio. Por favor, acepta la solicitud.')
        return
      }
    }

    setStarted(true)
    startButtonRef.current!.style.display = 'none'
    if (logElement.current) logElement.current.textContent = 'Capturando datos...'

    init()
    startSensors()
    animate()
  }

  return (
    <div ref={mountRef} className="relative w-full h-screen">
      {!started && (
        <button
          ref={startButtonRef}
          onClick={handleStart}
          className="absolute top-10 left-1/2 transform -translate-x-1/2 bg-blue-500 text-white px-4 py-2 rounded shadow-lg"
        >
          Comenzar
        </button>
      )}
      <div
        ref={logElement}
        className="absolute bottom-10 left-1/2 transform -translate-x-1/2 bg-black text-white p-2 text-sm rounded"
      >
        Esperando inicio...
      </div>
    </div>
  )
}

export default GyroScene
