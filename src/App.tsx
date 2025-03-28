import { useRef, useEffect, useState } from 'react'
import * as THREE from 'three'

const ThreeScene = () => {
  const mountRef = useRef(null)
  const [permissionGranted, setPermissionGranted] = useState(false)

  useEffect(() => {
    const mountNode = mountRef.current
    if (!mountNode) return
    if (!permissionGranted) return // Esperamos a obtener el permiso para sensores

    const squares = []
    const DISTANCE = 5
    // Objeto para guardar los últimos datos de orientación
    const orientationData = { alpha: 0, beta: 0, gamma: 0 }

    // Crear la escena y la cámara
    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(
      75,
      // @ts-expect-error xxx
      mountNode.clientWidth / mountNode.clientHeight,
      0.1,
      1000
    )
    camera.position.set(0, 0, 0)

    // Configurar el renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true })
    // @ts-expect-error xxx
    renderer.setSize(mountNode.clientWidth, mountNode.clientHeight)
    // @ts-expect-error xxx
    mountNode.appendChild(renderer.domElement)

    // Cuadrados base con sus colores y rotaciones
    const baseSquares = [
      { pos: [0, 0, -DISTANCE], rot: [0, 0, 0], color: 'red', type: 'base' }, // Adelante
      { pos: [0, 0, DISTANCE], rot: [0, Math.PI, 0], color: 'blue', type: 'base' }, // Atrás
      { pos: [0, DISTANCE, 0], rot: [-Math.PI / 2, 0, 0], color: 'green', type: 'base' }, // Arriba
      { pos: [0, -DISTANCE, 0], rot: [Math.PI / 2, 0, 0], color: 'yellow', type: 'base' }, // Abajo
      { pos: [-DISTANCE, 0, 0], rot: [0, Math.PI / 2, 0], color: 'purple', type: 'base' }, // Izquierda
      { pos: [DISTANCE, 0, 0], rot: [0, -Math.PI / 2, 0], color: 'orange', type: 'base' }, // Derecha
    ]

    // Generar cuadrados intermedios entre cada par de cuadrados base
    const intermediateSquares = []
    for (let i = 0; i < baseSquares.length; i++) {
      for (let j = i + 1; j < baseSquares.length; j++) {
        const posA = baseSquares[i].pos
        const posB = baseSquares[j].pos
        const midPos = [(posA[0] + posB[0]) / 2, (posA[1] + posB[1]) / 2, (posA[2] + posB[2]) / 2]
        const colorA = new THREE.Color(baseSquares[i].color)
        const colorB = new THREE.Color(baseSquares[j].color)
        const midColor = colorA.clone().lerp(colorB, 0.5).getStyle() // Degradado al 50%
        intermediateSquares.push({
          pos: midPos,
          rot: [0, 0, 0],
          color: midColor,
          type: 'intermediate',
        })
      }
    }

    // Unir todos los cuadrados
    const allSquares = baseSquares.concat(intermediateSquares)

    // Crear y agregar los cuadrados a la escena
    allSquares.forEach((cfg) => {
      const geometry = new THREE.PlaneGeometry(2, 2)
      const material = new THREE.MeshBasicMaterial({ color: cfg.color, side: THREE.DoubleSide })
      const plane = new THREE.Mesh(geometry, material)
      // @ts-expect-error xxx
      plane.position.set(...cfg.pos)
      if (cfg.type === 'base') {
        // @ts-expect-error xxx
        plane.rotation.set(...cfg.rot)
      } else if (cfg.type === 'intermediate') {
        // Hacer que el cuadrado intermedio mire al centro (la cámara en 0,0,0)
        plane.lookAt(new THREE.Vector3(0, 0, 0))
      }
      // Guardar posición inicial (para efecto flotante u otros si se desea)
      plane.userData.initialPosition = plane.position.clone()
      scene.add(plane)
      squares.push(plane)
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
    // @ts-expect-error xxx
    const handleOrientation = (event) => {
      orientationData.alpha = event.alpha || 0
      orientationData.beta = event.beta || 0
      orientationData.gamma = event.gamma || 0
    }

    window.addEventListener('deviceorientation', handleOrientation, true)

    // Quaternion de corrección
    const q1 = new THREE.Quaternion(-Math.sqrt(0.5), 0, 0, Math.sqrt(0.5))

    const animate = () => {
      requestAnimationFrame(animate)

      const alpha = THREE.MathUtils.degToRad(orientationData.alpha)
      const beta = THREE.MathUtils.degToRad(orientationData.beta)
      const euler = new THREE.Euler(beta, alpha, 0, 'YXZ')
      const quaternion = new THREE.Quaternion()
      quaternion.setFromEuler(euler)
      quaternion.multiply(q1)

      const screenOrientationAngle =
        screen.orientation && screen.orientation.angle ? screen.orientation.angle : 0
      const screenOrientation = THREE.MathUtils.degToRad(screenOrientationAngle)
      const screenTransform = new THREE.Quaternion()
      screenTransform.setFromAxisAngle(new THREE.Vector3(0, 0, 1), -screenOrientation)
      quaternion.multiply(screenTransform)

      camera.quaternion.copy(quaternion)

      renderer.render(scene, camera)
    }

    animate()

    const onWindowResize = () => {
      // @ts-expect-error xxx
      camera.aspect = mountNode.clientWidth / mountNode.clientHeight
      camera.updateProjectionMatrix()
      // @ts-expect-error xxx
      renderer.setSize(mountNode.clientWidth, mountNode.clientHeight)
    }
    window.addEventListener('resize', onWindowResize)

    return () => {
      window.removeEventListener('deviceorientation', handleOrientation, true)
      window.removeEventListener('resize', onWindowResize)
      if (mountNode && renderer.domElement) {
        // @ts-expect-error xxx
        mountNode.removeChild(renderer.domElement)
      }
    }
  }, [permissionGranted])

  // Solicitar permiso para acceder a los sensores (requerido en iOS 13+)
  const requestPermission = () => {
    if (
      typeof DeviceOrientationEvent !== 'undefined' &&
      // @ts-expect-error xxx
      typeof DeviceOrientationEvent.requestPermission === 'function'
    ) {
      // @ts-expect-error xxx
      DeviceOrientationEvent.requestPermission()
        // @ts-expect-error xxx
        .then((response) => {
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

export default ThreeScene
