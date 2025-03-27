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
  let videoTexture: THREE.VideoTexture | null = null
  let alpha = 0,
    beta = 0,
    gamma = 0

  const init = async () => {
    scene = new THREE.Scene()
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000)
    renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setSize(window.innerWidth, window.innerHeight)
    mountRef.current?.appendChild(renderer.domElement)

    // Acceder a la cámara del usuario y crear una textura de video
    const stream = await navigator.mediaDevices.getUserMedia({ video: true })
    const video = document.createElement('video')
    video.srcObject = stream
    video.play()

    // Crear la textura de la cámara
    videoTexture = new THREE.VideoTexture(video)
    videoTexture.minFilter = THREE.LinearFilter
    videoTexture.magFilter = THREE.LinearFilter
    videoTexture.format = THREE.RGBFormat

    // Crear un plano gigante de fondo para la cámara (estático)
    const backgroundGeometry = new THREE.PlaneGeometry(200, 200)
    const backgroundMaterial = new THREE.MeshBasicMaterial({
      map: videoTexture,
      side: THREE.DoubleSide,
    })
    const backgroundPlane = new THREE.Mesh(backgroundGeometry, backgroundMaterial)
    backgroundPlane.position.set(0, 0, -50) // Colocarlo lejos del centro para que cubra todo el fondo
    scene.add(backgroundPlane)

    // Crear planos con diferentes colores, pero solo los planos se moverán
    const positions = [
      { pos: [0, 0, -5], rot: [0, 0, 0], color: 'red' }, // Adelante
      { pos: [0, 0, 5], rot: [0, Math.PI, 0], color: 'blue' }, // Atrás
      { pos: [0, 5, 0], rot: [-Math.PI / 2, 0, 0], color: 'green' }, // Arriba
      { pos: [0, -5, 0], rot: [Math.PI / 2, 0, 0], color: 'yellow' }, // Abajo
      { pos: [-5, 0, 0], rot: [0, Math.PI / 2, 0], color: 'purple' }, // Izquierda
      { pos: [5, 0, 0], rot: [0, -Math.PI / 2, 0], color: 'orange' }, // Derecha
    ]

    positions.forEach(({ pos, rot, color }) => {
      const geometry = new THREE.PlaneGeometry(3, 3) // Tamaño del plano
      const material = new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide })
      const plane = new THREE.Mesh(geometry, material)
      plane.position.set(pos[0], pos[1], pos[2])
      plane.rotation.set(rot[0], rot[1], rot[2])
      scene.add(plane)
    })

    camera.position.set(0, 0, 0)

    window.addEventListener('resize', onWindowResize)
  }

  const onWindowResize = () => {
    camera.aspect = window.innerWidth / window.innerHeight
    camera.updateProjectionMatrix()
    renderer.setSize(window.innerWidth, window.innerHeight)
  }

  const startSensors = () => {
    window.addEventListener('deviceorientation', (event) => {
      alpha = event.alpha ?? 0
      beta = event.beta ?? 0
      gamma = event.gamma ?? 0

      if (logElement.current) {
        logElement.current.textContent = `alpha: ${alpha.toFixed(
          2
        )}, beta: ${beta.toFixed(2)}, gamma: ${gamma.toFixed(2)}`
      }

      // Rotar solo los planos con los datos del giroscopio
      scene.children.forEach((child) => {
        if (child instanceof THREE.Mesh) {
          child.rotation.set(
            THREE.MathUtils.degToRad(beta),
            THREE.MathUtils.degToRad(gamma),
            THREE.MathUtils.degToRad(alpha)
          )
        }
      })
    })
  }

  const animate = () => {
    requestAnimationFrame(animate)
    renderer.render(scene, camera)
  }

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

    await init()
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
