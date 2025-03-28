import { useRef, useEffect, useState } from 'react'
import * as THREE from 'three'
// @ts-ignore
import { DeviceOrientationControls } from './controls.js'

/**
 * @author richt / http://richt.me
 * @author WestLangley / http://github.com/WestLangley
 *
 * W3C Device Orientation control (http://w3c.github.io/deviceorientation/spec-source-orientation.html)
 */

const ThreeScene = () => {
  const mountRef = useRef(null)
  const [permissionGranted, setPermissionGranted] = useState(false)

  useEffect(() => {
    if (!permissionGranted) return // No inicializamos hasta obtener permiso

    let scene, camera, renderer, controls
    // @ts-ignore
    let squares = []
    const DISTANCE = 5 // Ajusta la distancia según tu necesidad

    // Crear la escena
    scene = new THREE.Scene()

    // Crear la cámara en el origen
    camera = new THREE.PerspectiveCamera(
      75,
      // @ts-ignore
      mountRef.current.clientWidth / mountRef.current.clientHeight,
      0.1,
      1000
    )
    camera.position.set(0, 0, 0)

    // Configurar el renderer y agregarlo al DOM
    renderer = new THREE.WebGLRenderer({ antialias: true })
    // @ts-ignore
    renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight)
    // @ts-ignore
    mountRef.current.appendChild(renderer.domElement)

    // Configuración de los 6 cuadrados (planos) con posición, rotación y color
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

    // Inicializar DeviceOrientationControls para usar giroscopio y acelerómetro
    controls = new DeviceOrientationControls(camera)

    // Actualizar el renderer al redimensionar la ventana
    const onWindowResize = () => {
      // @ts-ignore
      camera.aspect = mountRef.current.clientWidth / mountRef.current.clientHeight
      camera.updateProjectionMatrix()
      // @ts-ignore
      renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight)
    }
    window.addEventListener('resize', onWindowResize)

    // Loop de animación
    const animate = () => {
      requestAnimationFrame(animate)

      // Actualizamos los controles que leen los sensores
      if (controls) controls.update()

      // Efecto de flotación para los cuadrados (movimiento vertical)
      const time = Date.now() * 0.002
      // @ts-ignore
      squares.forEach((plane) => {
        plane.position.y = plane.userData.initialPosition.y + Math.sin(time) * 0.2
      })

      renderer.render(scene, camera)
    }

    animate()

    // Cleanup al desmontar el componente
    return () => {
      // @ts-ignore
      mountRef.current.removeChild(renderer.domElement)
      window.removeEventListener('resize', onWindowResize)
    }
  }, [permissionGranted])

  // Función para solicitar permiso para acceder a los sensores del dispositivo (requerido en iOS 13+)
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
      // Si no se requiere permiso (otros dispositivos)
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
