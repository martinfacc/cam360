import { useEffect, useRef } from 'react'
import * as THREE from 'three'

const ARApp = () => {
  const canvasRef = useRef(null)
  const videoRef = useRef(null)
  const sceneRef = useRef(new THREE.Scene())
  const cameraRef = useRef(
    new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 100)
  )
  const rendererRef = useRef(null)

  // Iniciar la cámara del dispositivo con WebRTC
  const initCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      })
      // @ts-expect-error xxx
      videoRef.current.srcObject = stream
    } catch (err) {
      console.error('Error al acceder a la cámara:', err)
    }
  }

  // Crear los 6 cuadrados flotantes
  // @ts-expect-error xxx
  const createCubes = (scene) => {
    const DISTANCE = 2
    const cubes = [
      { pos: [0, 0, -DISTANCE], rot: [0, 0, 0], color: 'red' }, // Adelante
      { pos: [0, 0, DISTANCE], rot: [0, Math.PI, 0], color: 'blue' }, // Atrás
      { pos: [0, DISTANCE, 0], rot: [-Math.PI / 2, 0, 0], color: 'green' }, // Arriba
      { pos: [0, -DISTANCE, 0], rot: [Math.PI / 2, 0, 0], color: 'yellow' }, // Abajo
      { pos: [-DISTANCE, 0, 0], rot: [0, Math.PI / 2, 0], color: 'purple' }, // Izquierda
      { pos: [DISTANCE, 0, 0], rot: [0, -Math.PI / 2, 0], color: 'orange' }, // Derecha
    ]

    cubes.forEach(({ pos, rot, color }) => {
      const geometry = new THREE.PlaneGeometry(1, 1)
      const material = new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide })
      const plane = new THREE.Mesh(geometry, material)
      // @ts-expect-error xxx
      plane.position.set(...pos)
      // @ts-expect-error xxx
      plane.rotation.set(...rot)
      scene.add(plane)
    })
  }

  // Sincronizar la rotación de la cámara con los sensores
  const syncSensorOrientation = () => {
    let beta = 0,
      gamma = 0

    // Escuchar eventos de la orientación del dispositivo
    window.addEventListener('deviceorientation', (event) => {
      beta = event.beta || 0 // Inclinación adelante/atrás
      gamma = event.gamma || 0 // Inclinación izquierda/derecha
    })

    return { beta, gamma }
  }

  // Iniciar la escena y animación
  const startAR = () => {
    const canvas = canvasRef.current
    const video = videoRef.current

    // Configurar Three.js
    // @ts-expect-error xxx
    rendererRef.current = new THREE.WebGLRenderer({ alpha: true, canvas })
    // @ts-expect-error xxx
    rendererRef.current.setSize(window.innerWidth, window.innerHeight)

    const camera = cameraRef.current
    camera.position.z = 5

    // Crear la escena de AR y los cuadrados flotantes
    createCubes(sceneRef.current)

    // Configurar la cámara de video como fondo

    // @ts-expect-error xxx
    video.style.position = 'fixed'
    // @ts-expect-error xxx
    video.style.top = '0'
    // @ts-expect-error xxx
    video.style.left = '0'
    // @ts-expect-error xxx
    video.style.width = '100%'
    // @ts-expect-error xxx
    video.style.height = '100%'
    // @ts-expect-error xxx
    video.style.objectFit = 'cover'

    // Sincronizar el movimiento de la cámara con los sensores
    const { beta, gamma } = syncSensorOrientation()

    // Animación de la escena
    const animate = () => {
      requestAnimationFrame(animate)

      // Actualizar la cámara según los sensores
      camera.rotation.x = beta * (Math.PI / 180)
      camera.rotation.y = gamma * (Math.PI / 180)

      // @ts-expect-error xxx
      rendererRef.current.render(sceneRef.current, camera)
    }

    animate()
  }

  useEffect(() => {
    initCamera()
    startAR()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div>
      {/* @ts-expect-error xxx */}
      <video ref={videoRef} autoplay playsinline />
      <canvas ref={canvasRef} />
    </div>
  )
}

export default ARApp
