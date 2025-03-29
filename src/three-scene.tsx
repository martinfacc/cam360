import React, { useRef, useEffect, useState } from 'react'
import * as THREE from 'three'

export default function ThreeScene() {
  const mountRef = useRef<HTMLDivElement>(null)
  const [permissionGranted, setPermissionGranted] = useState(false)
  const [currentOrientation, setCurrentOrientation] = useState({
    alpha: 0,
    beta: 0,
    gamma: 0,
  })

  useEffect(() => {
    const mountNode = mountRef.current
    if (!mountNode) return
    if (!permissionGranted) return

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

    const squareGeometry = new THREE.PlaneGeometry(2, 2)
    const squareMaterial = new THREE.MeshBasicMaterial({
      color: 0xff0000,
      side: THREE.DoubleSide,
    })
    const squareMesh = new THREE.Mesh(squareGeometry, squareMaterial)
    squareMesh.position.set(0, 0, -25)
    squareMesh.rotation.set(0, 0, 0)
    scene.add(squareMesh)

    const squareMesh2 = new THREE.Mesh(squareGeometry, squareMaterial)
    squareMesh2.position.set(0, 0, 25)
    squareMesh2.rotation.set(0, Math.PI, 0)
    scene.add(squareMesh2)

    const squareMesh3 = new THREE.Mesh(squareGeometry, squareMaterial)
    squareMesh3.position.set(0, -25, 0)
    squareMesh3.rotation.set(Math.PI / 2, 0, 0)
    scene.add(squareMesh3)

    const squareMesh4 = new THREE.Mesh(squareGeometry, squareMaterial)
    squareMesh4.position.set(0, 25, 0)
    squareMesh4.rotation.set(-Math.PI / 2, 0, 0)
    scene.add(squareMesh4)

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

    let alpha = 0
    let beta = 0
    let gamma = 0

    const handleOrientation = (event: DeviceOrientationEvent) => {
      if (!event.alpha || !event.beta || !event.gamma) return

      // Convertir los ángulos de Euler a radianes
      alpha = THREE.MathUtils.degToRad(event.alpha)
      beta = THREE.MathUtils.degToRad(event.beta)
      gamma = THREE.MathUtils.degToRad(event.gamma)

      setCurrentOrientation({
        alpha,
        beta,
        gamma,
      })
    }

    window.addEventListener('deviceorientation', handleOrientation, true)

    const animate = () => {
      requestAnimationFrame(animate)

      // Actualizar la posición de la cámara
      camera.rotation.set(beta, gamma, alpha, 'XYZ')

      renderer.render(scene, camera)
    }
    animate()

    // Actualizar tamaño al redimensionar
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
      // @ts-expect-error no-types
      typeof DeviceOrientationEvent.requestPermission === 'function'
    ) {
      // @ts-expect-error no-types
      DeviceOrientationEvent.requestPermission()
        .then((response: 'granted' | 'denied') => {
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
      <div
        style={{
          position: 'absolute',
          zIndex: 1,
          top: '10px',
          left: '10px',
          color: 'white',
        }}
      >
        Orientación:
        <br />
        Alpha: {currentOrientation.alpha.toFixed(2)}
        <br />
        Beta: {currentOrientation.beta.toFixed(2)}
        <br />
        Gamma: {currentOrientation.gamma.toFixed(2)}
      </div>
      <div ref={mountRef} style={{ width: '100vw', height: '100vh', overflow: 'hidden' }} />
    </React.Fragment>
  )
}
