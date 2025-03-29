import React, { useRef, useEffect, useState } from 'react'
import * as THREE from 'three'
import { getColorFromPosition, getSphereTransforms } from './utils'

const DISTANCE = 5
const SPHERE_RADIUS = 0.3
const SPHERE_SEGMENTS = 16
const SPHERE_COUNT = 16
const SPHERE_OPACITY = 0.5

export default function ThreeScene() {
  const mountRef = useRef<HTMLDivElement>(null)
  const [permissionGranted, setPermissionGranted] = useState(false)
  const [currentOrientation, setCurrentOrientation] = useState({
    alpha: 0,
    beta: 0,
    gamma: 0,
  })
  const [currentScreenOrientation, setCurrentScreenOrientation] = useState(0)
  const [currentCameraPosition, setCurrentCameraPosition] = useState({
    x: 0,
    y: 0,
    z: 0,
  })
  const [currentCameraRotation, setCurrentCameraRotation] = useState({
    x: 0,
    y: 0,
    z: 0,
  })

  // Referencia para almacenar el offset de calibración
  const calibrationRef = useRef({ alpha: 0, beta: 0, gamma: 0 })

  // Objeto para guardar los últimos datos de orientación
  const orientationData = useRef({ alpha: 0, beta: 0, gamma: 0 })

  // Función para calibrar: se almacena la lectura actual como offset
  const handleCalibrate = () => {
    calibrationRef.current = {
      alpha: orientationData.current.alpha,
      beta: orientationData.current.beta,
      gamma: orientationData.current.gamma,
    }
    console.log('Calibrado:', calibrationRef.current)
  }

  useEffect(() => {
    const mountNode = mountRef.current
    if (!mountNode) return
    if (!permissionGranted) return

    const elements: THREE.Mesh[] = []

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

    // Generar los puntos en la esfera
    const sphereTransforms = getSphereTransforms(DISTANCE, SPHERE_COUNT)
    sphereTransforms.forEach((cfg) => {
      const geometry = new THREE.SphereGeometry(SPHERE_RADIUS, SPHERE_SEGMENTS, SPHERE_SEGMENTS)
      const color = getColorFromPosition(cfg.pos)
      const material = new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: SPHERE_OPACITY,
      })
      const sphere = new THREE.Mesh(geometry, material)
      sphere.position.set(...cfg.pos)
      sphere.rotation.set(...cfg.rot)
      scene.add(sphere)
      elements.push(sphere)
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
    const handleOrientation = (event: DeviceOrientationEvent) => {
      orientationData.current.alpha = event.alpha !== null ? (event.alpha + 360) % 360 : 0
      orientationData.current.beta =
        event.beta !== null ? Math.max(-180, Math.min(180, event.beta)) : 0
      orientationData.current.gamma =
        event.gamma !== null ? Math.max(-90, Math.min(90, event.gamma)) : 0
    }
    window.addEventListener('deviceorientation', handleOrientation, true)

    window.matchMedia('(orientation: landscape)').addEventListener('change', (e) => {
      if (e.matches) {
        // Landscape mode
        console.log('Landscape mode')
      } else {
        // Portrait mode
        console.log('Portrait mode')
      }
    })

    window.matchMedia('(orientation: portrait)').addEventListener('change', (e) => {
      if (e.matches) {
        // Portrait mode
        console.log('Portrait mode')
      } else {
        // Landscape mode
        console.log('Landscape mode')
      }
    })

    // Configurar la luz
    const light = new THREE.DirectionalLight(0xffffff, 1)
    light.position.set(5, 5, 5).normalize()
    scene.add(light)
    const ambientLight = new THREE.AmbientLight(0x404040, 1) // Soft white light
    scene.add(ambientLight)
    // Crear un objeto pivot para la cámara
    const pivot = new THREE.Object3D()
    scene.add(pivot)
    pivot.add(camera)
    // Posicionar la cámara
    camera.position.set(0, 0, 0)
    // Rotar la cámara para que mire hacia adelante
    camera.rotation.set(0, 0, 0)
    // Crear un objeto de referencia para la posición de la cámara
    const cameraPosition = new THREE.Vector3(0, 0, 0)
    setCurrentCameraPosition({
      x: cameraPosition.x,
      y: cameraPosition.y,
      z: cameraPosition.z,
    })
    setCurrentCameraRotation({
      x: camera.rotation.x,
      y: camera.rotation.y,
      z: camera.rotation.z,
    })
    // Crear un objeto de referencia para la rotación de la cámara
    const cameraRotation = new THREE.Quaternion()
    cameraRotation.setFromEuler(camera.rotation)
    camera.quaternion.copy(cameraRotation)
    // Aplicar la rotación inicial a la cámara
    camera.quaternion.multiply(cameraRotation)
    // Aplicar la posición inicial a la cámara
    camera.position.copy(cameraPosition)

    const animate = () => {
      requestAnimationFrame(animate)

      // Aplicar la calibración: restamos el offset a la lectura actual
      const calibratedAlpha =
        (orientationData.current.alpha - calibrationRef.current.alpha + 360) % 360
      const calibratedBeta = orientationData.current.beta - calibrationRef.current.beta
      const calibratedGamma = orientationData.current.gamma - calibrationRef.current.gamma
      // Ignoramos gamma para evitar roll no deseado
      // Actualizamos el estado de la orientación
      setCurrentOrientation({
        alpha: calibratedAlpha,
        beta: calibratedBeta,
        gamma: calibratedGamma,
      })
      // Convertir a radianes
      const alphaRad = THREE.MathUtils.degToRad(calibratedAlpha)
      const betaRad = THREE.MathUtils.degToRad(calibratedBeta)

      // Creamos un Euler con el orden "YXZ"
      const euler = new THREE.Euler(betaRad, alphaRad, 0, 'YXZ')
      const quaternion = new THREE.Quaternion()
      quaternion.setFromEuler(euler)
      // Ajustamos según la orientación de la pantalla
      const screenOrientationAngle =
        screen.orientation && screen.orientation.angle ? screen.orientation.angle : 0
      setCurrentScreenOrientation(screenOrientationAngle)
      const screenOrientation = THREE.MathUtils.degToRad(screenOrientationAngle)
      const screenTransform = new THREE.Quaternion()
      screenTransform.setFromAxisAngle(new THREE.Vector3(0, 0, 1), -screenOrientation)
      quaternion.multiply(screenTransform)
      // Asignamos el quaternion resultante a la cámara
      camera.quaternion.copy(quaternion)
      // Aplicar la posición de la cámara
      const cameraPosition = new THREE.Vector3(
        currentCameraPosition.x,
        currentCameraPosition.y,
        currentCameraPosition.z
      )
      cameraPosition.applyQuaternion(quaternion)
      // Aplicar la rotación de la cámara
      const cameraRotation = new THREE.Quaternion()
      cameraRotation.setFromEuler(camera.rotation)
      cameraRotation.multiply(quaternion)
      // Aplicar la posición de la cámara
      camera.position.copy(cameraPosition)

      setCurrentCameraPosition({
        x: camera.position.x,
        y: camera.position.y,
        z: camera.position.z,
      })

      setCurrentCameraRotation({
        x: camera.rotation.x,
        y: camera.rotation.y,
        z: camera.rotation.z,
      })

      // Renderizar la escena
      renderer.render(scene, camera)
    }

    // // Corrección fija para alinear el dispositivo con la escena
    // const q1 = new THREE.Quaternion(-Math.sqrt(0.5), 0, 0, Math.sqrt(0.5))

    // const animate = () => {
    //   requestAnimationFrame(animate)

    //   // Aplicamos la calibración: restamos el offset a la lectura actual
    //   const calibratedAlpha =
    //     (orientationData.current.alpha - calibrationRef.current.alpha + 360) % 360
    //   const calibratedBeta = orientationData.current.beta - calibrationRef.current.beta
    //   // Ignoramos gamma para evitar roll no deseado

    //   // Actualizamos el estado de la orientación
    //   setCurrentOrientation({
    //     alpha: calibratedAlpha,
    //     beta: calibratedBeta,
    //     gamma: orientationData.current.gamma,
    //   })

    //   // Convertir a radianes
    //   const alphaRad = THREE.MathUtils.degToRad(calibratedAlpha)
    //   const betaRad = THREE.MathUtils.degToRad(calibratedBeta)

    //   // Creamos un Euler con el orden "YXZ"
    //   const euler = new THREE.Euler(betaRad, alphaRad, 0, 'YXZ')
    //   const quaternion = new THREE.Quaternion()
    //   quaternion.setFromEuler(euler)

    //   // Aplicamos la corrección fija
    //   quaternion.multiply(q1)

    //   // Ajustamos según la orientación de la pantalla
    //   const screenOrientationAngle =
    //     screen.orientation && screen.orientation.angle ? screen.orientation.angle : 0

    //   setCurrentScreenOrientation(screenOrientationAngle)

    //   const screenOrientation = THREE.MathUtils.degToRad(screenOrientationAngle)
    //   const screenTransform = new THREE.Quaternion()
    //   screenTransform.setFromAxisAngle(new THREE.Vector3(0, 0, 1), -screenOrientation)
    //   quaternion.multiply(screenTransform)

    //   // Asignamos el quaternion resultante a la cámara
    //   camera.quaternion.copy(quaternion)

    //   // Actualizamos la posición de la cámara
    //   const cameraPosition = new THREE.Vector3(
    //     currentCameraPosition.x,
    //     currentCameraPosition.y,
    //     currentCameraPosition.z
    //   )
    //   cameraPosition.applyQuaternion(quaternion)
    //   camera.position.copy(cameraPosition)
    //   setCurrentCameraPosition({
    //     x: cameraPosition.x,
    //     y: cameraPosition.y,
    //     z: cameraPosition.z,
    //   })
    //   setCurrentCameraRotation({
    //     x: quaternion.x,
    //     y: quaternion.y,
    //     z: quaternion.z,
    //   })

    //   renderer.render(scene, camera)
    // }
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      {permissionGranted && (
        <button
          style={{
            position: 'absolute',
            zIndex: 1,
            top: '1rem',
            right: '1rem',
            padding: '0.5rem',
            fontSize: '1rem',
          }}
          onClick={handleCalibrate}
        >
          Calibrar
        </button>
      )}
      <div
        style={{
          position: 'absolute',
          zIndex: 1,
          top: '1rem',
          left: '1rem',
          color: 'white',
        }}
      >
        <p>
          Orientación:
          <br />
          Alpha: {currentOrientation.alpha.toFixed(2)}°<br />
          Beta: {currentOrientation.beta.toFixed(2)}°<br />
          Gamma: {currentOrientation.gamma.toFixed(2)}°<br />
          Angulo de pantalla: {currentScreenOrientation.toFixed(2)}°
        </p>
        <p>
          Posición de la cámara:
          <br />
          X: {currentCameraPosition.x.toFixed(2)}
          <br />
          Y: {currentCameraPosition.y.toFixed(2)}
          <br />
          Z: {currentCameraPosition.z.toFixed(2)}
          <br />
          Rotación de la cámara:
          <br />
          X: {currentCameraRotation.x.toFixed(2)}
          <br />
          Y: {currentCameraRotation.y.toFixed(2)}
          <br />
          Z: {currentCameraRotation.z.toFixed(2)}
          <br />
        </p>
      </div>
      <div ref={mountRef} style={{ width: '100vw', height: '100vh', overflow: 'hidden' }} />
    </React.Fragment>
  )
}
