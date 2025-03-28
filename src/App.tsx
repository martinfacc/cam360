import { useRef, useEffect, useState } from 'react'
import * as THREE from 'three'

const ThreeScene = () => {
  const mountRef = useRef(null)
  const [permissionGranted, setPermissionGranted] = useState(false)

  useEffect(() => {
    if (!permissionGranted) return // Esperamos a obtener el permiso para sensores

    let scene, camera, renderer
    // @ts-ignore
    const squares = []
    const DISTANCE = 5
    // Objeto para guardar los últimos datos de orientación
    const orientationData = { alpha: 0, beta: 0, gamma: 0 }

    // Crear la escena y la cámara
    scene = new THREE.Scene()
    camera = new THREE.PerspectiveCamera(
      75,
      // @ts-ignore
      mountRef.current.clientWidth / mountRef.current.clientHeight,
      0.1,
      1000
    )
    camera.position.set(0, 0, 0)

    // Configurar el renderer
    renderer = new THREE.WebGLRenderer({ antialias: true })
    // @ts-ignore
    renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight)
    // @ts-ignore
    mountRef.current.appendChild(renderer.domElement)

    // Configurar los 6 cuadrados (planos)
    const configSquares = [
      { pos: [0, 0, -DISTANCE], rot: [0, 0, 0], color: 'red' }, // Adelante
      { pos: [0, 0, DISTANCE], rot: [0, Math.PI, 0], color: 'blue' }, // Atrás
      { pos: [0, DISTANCE, 0], rot: [-Math.PI / 2, 0, 0], color: 'green' }, // Arriba
      { pos: [0, -DISTANCE, 0], rot: [Math.PI / 2, 0, 0], color: 'yellow' }, // Abajo
      { pos: [-DISTANCE, 0, 0], rot: [0, Math.PI / 2, 0], color: 'purple' }, // Izquierda
      { pos: [DISTANCE, 0, 0], rot: [0, -Math.PI / 2, 0], color: 'orange' }, // Derecha
    ]

    configSquares.forEach((cfg) => {
      const geometry = new THREE.PlaneGeometry(2, 2)
      const material = new THREE.MeshBasicMaterial({ color: cfg.color, side: THREE.DoubleSide })
      const plane = new THREE.Mesh(geometry, material)
      // @ts-ignore
      plane.position.set(...cfg.pos)
      // @ts-ignore
      plane.rotation.set(...cfg.rot)
      // Guardamos la posición inicial para el efecto flotante
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
    // @ts-ignore
    const handleOrientation = (event) => {
      // event.alpha, event.beta y event.gamma vienen en grados
      orientationData.alpha = event.alpha || 0
      orientationData.beta = event.beta || 0
      orientationData.gamma = event.gamma || 0
    }

    window.addEventListener('deviceorientation', handleOrientation, true)

    // Animación: actualiza la cámara y los cuadrados
    const animate = () => {
      requestAnimationFrame(animate)

      // Convertir a radianes
      const alpha = THREE.MathUtils.degToRad(orientationData.alpha)
      const beta = THREE.MathUtils.degToRad(orientationData.beta)
      const gamma = THREE.MathUtils.degToRad(orientationData.gamma)

      // Creamos un Euler. El orden "YXZ" es común para estos casos
      const euler = new THREE.Euler(beta, alpha, -gamma, 'YXZ')
      const quaternion = new THREE.Quaternion()
      quaternion.setFromEuler(euler)

      // Ajustar por la orientación de la pantalla
      const screenOrientation = window.orientation
        ? THREE.MathUtils.degToRad(window.orientation)
        : 0
      const screenTransform = new THREE.Quaternion()
      screenTransform.setFromAxisAngle(new THREE.Vector3(0, 0, 1), -screenOrientation)
      quaternion.multiply(screenTransform)

      camera.quaternion.copy(quaternion)

      // Efecto flotante para los cuadrados
      const time = Date.now() * 0.002
      // @ts-ignore
      squares.forEach((plane) => {
        plane.position.y = plane.userData.initialPosition.y + Math.sin(time) * 0.2
      })

      renderer.render(scene, camera)
    }

    animate()

    // Actualizar tamaño al redimensionar
    const onWindowResize = () => {
      // @ts-ignore
      camera.aspect = mountRef.current.clientWidth / mountRef.current.clientHeight
      camera.updateProjectionMatrix()
      // @ts-ignore
      renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight)
    }
    window.addEventListener('resize', onWindowResize)

    // Cleanup al desmontar
    return () => {
      window.removeEventListener('deviceorientation', handleOrientation, true)
      window.removeEventListener('resize', onWindowResize)
      // @ts-ignore
      mountRef.current.removeChild(renderer.domElement)
    }
  }, [permissionGranted])

  // Solicitar permiso para acceder a los sensores (requerido en iOS 13+)
  const requestPermission = () => {
    if (
      typeof DeviceOrientationEvent !== 'undefined' &&
      // @ts-ignore
      typeof DeviceOrientationEvent.requestPermission === 'function'
    ) {
      // @ts-ignore
      DeviceOrientationEvent.requestPermission()
        // @ts-ignore
        .then((response) => {
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
