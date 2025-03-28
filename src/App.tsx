import { useRef, useEffect } from 'react'
import * as THREE from 'three'

const ThreeScene = () => {
  const mountRef = useRef(null)

  useEffect(() => {
    let scene, camera, renderer
    // @ts-ignore
    let squares = []
    const DISTANCE = 5 // Ajusta la distancia si es necesario

    // Variables para controlar la interacción del usuario
    let isUserInteracting = false,
      lon = 0,
      lat = 0,
      onPointerDownLon = 0,
      onPointerDownLat = 0,
      onPointerDownClientX = 0,
      onPointerDownClientY = 0

    // Crear la escena
    scene = new THREE.Scene()

    // Crear la cámara en (0,0,0)
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

    // Definir los 6 cuadrados (planos) con posición, rotación y color
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
      const material = new THREE.MeshBasicMaterial({
        color: cfg.color,
        side: THREE.DoubleSide,
      })
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

    // Funciones para controlar la interacción (mouse y tacto)
    // @ts-ignore
    const onPointerDown = (event) => {
      isUserInteracting = true
      onPointerDownClientX = event.clientX !== undefined ? event.clientX : event.touches[0].clientX
      onPointerDownClientY = event.clientY !== undefined ? event.clientY : event.touches[0].clientY
      onPointerDownLon = lon
      onPointerDownLat = lat
    }

    // @ts-ignore
    const onPointerMove = (event) => {
      if (isUserInteracting === true) {
        const clientX = event.clientX !== undefined ? event.clientX : event.touches[0].clientX
        const clientY = event.clientY !== undefined ? event.clientY : event.touches[0].clientY
        lon = (onPointerDownClientX - clientX) * 0.1 + onPointerDownLon
        lat = (clientY - onPointerDownClientY) * 0.1 + onPointerDownLat
      }
    }

    const onPointerUp = () => {
      isUserInteracting = false
    }

    // Añadir event listeners a la referencia
    // @ts-ignore
    mountRef.current.addEventListener('mousedown', onPointerDown, false)
    // @ts-ignore
    mountRef.current.addEventListener('mousemove', onPointerMove, false)
    // @ts-ignore
    mountRef.current.addEventListener('mouseup', onPointerUp, false)
    // @ts-ignore
    mountRef.current.addEventListener('touchstart', onPointerDown, false)
    // @ts-ignore
    mountRef.current.addEventListener('touchmove', onPointerMove, false)
    // @ts-ignore
    mountRef.current.addEventListener('touchend', onPointerUp, false)

    // Ajustar el tamaño del renderer al redimensionar la ventana
    const onWindowResize = () => {
      // @ts-ignore
      camera.aspect = mountRef.current.clientWidth / mountRef.current.clientHeight
      camera.updateProjectionMatrix()
      // @ts-ignore
      renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight)
    }
    window.addEventListener('resize', onWindowResize)

    // Animación: actualizar cámara y efecto flotante en los cuadrados
    const animate = () => {
      requestAnimationFrame(animate)

      // Actualizar la dirección de la cámara según la interacción del usuario
      lat = Math.max(-85, Math.min(85, lat))
      const phi = THREE.MathUtils.degToRad(90 - lat)
      const theta = THREE.MathUtils.degToRad(lon)

      const target = new THREE.Vector3()
      target.x = Math.sin(phi) * Math.cos(theta)
      target.y = Math.cos(phi)
      target.z = Math.sin(phi) * Math.sin(theta)
      camera.lookAt(target)

      // Animación flotante de los cuadrados (movimiento vertical)
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
      // @ts-ignore
      mountRef.current.removeEventListener('mousedown', onPointerDown)
      // @ts-ignore
      mountRef.current.removeEventListener('mousemove', onPointerMove)
      // @ts-ignore
      mountRef.current.removeEventListener('mouseup', onPointerUp)
      // @ts-ignore
      mountRef.current.removeEventListener('touchstart', onPointerDown)
      // @ts-ignore
      mountRef.current.removeEventListener('touchmove', onPointerMove)
      // @ts-ignore
      mountRef.current.removeEventListener('touchend', onPointerUp)
    }
  }, [])

  return <div ref={mountRef} style={{ width: '100vw', height: '100vh', overflow: 'hidden' }} />
}

export default ThreeScene
