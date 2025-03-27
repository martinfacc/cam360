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
    window.addEventListener(
      'deviceorientation',
      (event) => {
        // Obtiene los valores de orientación del dispositivo
        const alpha = event.alpha ? THREE.MathUtils.degToRad(event.alpha) : 0 // Rotación alrededor del eje Z
        const beta = event.beta ? THREE.MathUtils.degToRad(event.beta) : 0 // Rotación alrededor del eje X
        const gamma = event.gamma ? THREE.MathUtils.degToRad(event.gamma) : 0 // Rotación alrededor del eje Y
        // Actualiza la rotación de la cámara
        camera.rotation.set(beta, gamma, alpha)
      },
      true
    )
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
