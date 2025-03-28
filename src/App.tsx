import { useRef, useEffect, useState } from 'react'
import * as THREE from 'three'

type SphereTransform = {
  pos: [number, number, number] // Posición [x, y, z]
  rot: [number, number, number] // Rotación [yaw, pitch, roll]
}

/**
 * Genera 'n' puntos en la superficie de una esfera de radio 'r'.
 * Para cada punto se devuelve su posición en 3D y su rotación hacia el centro.
 *
 * @param r - Radio de la esfera
 * @param n - Cantidad de puntos
 * @returns Array de objetos { pos: [x, y, z], rot: [yaw, pitch, roll] }
 */
function getSphereTransforms(r: number, n: number): SphereTransform[] {
  const puntos: SphereTransform[] = []
  const goldenAngle = Math.PI * (3 - Math.sqrt(5)) // Ángulo dorado

  for (let i = 0; i < n; i++) {
    const y = 1 - (2 * i + 1) / n
    const radius = Math.sqrt(1 - y * y)
    const theta = goldenAngle * i

    const x = radius * Math.cos(theta)
    const z = radius * Math.sin(theta)

    const pos: [number, number, number] = [x * r, y * r, z * r]

    // Direcciones normalizadas hacia el centro
    const dirX = -x
    const dirY = -y
    const dirZ = -z

    // Cálculo de ángulos de rotación
    const yaw = Math.atan2(dirX, dirZ)
    const planoXZ = Math.sqrt(dirX * dirX + dirZ * dirZ)
    const pitch = Math.atan2(dirY, planoXZ)
    const roll = 0

    const rot: [number, number, number] = [yaw, pitch, roll]

    puntos.push({ pos, rot })
  }

  return puntos
}

/**
 * Dada una posición en 3D [x, y, z], genera un color HSL único relacionado con el círculo cromático.
 * Se utiliza la proyección en el plano XZ para calcular el ángulo y mapearlo a un hue entre 0 y 360.
 *
 * @param pos - Tupla [x, y, z] que representa la posición.
 * @returns Un string con el color en formato HSL.
 */
function getColorFromPosition(pos: [number, number, number]): string {
  const [x, , z] = pos
  // Calculamos el ángulo en el plano XZ (rango [-π, π])
  const angle = Math.atan2(z, x)
  // Convertimos a grados
  let hue = (angle * 180) / Math.PI
  // Normalizamos para que el hue esté entre 0 y 360
  if (hue < 0) hue += 360

  // Se pueden ajustar la saturación y luminosidad a gusto, aquí se usan valores fijos.
  return `hsl(${hue}, 70%, 50%)`
}

const ThreeScene = () => {
  const mountRef = useRef(null)
  const [permissionGranted, setPermissionGranted] = useState(false)

  useEffect(() => {
    const mountNode = mountRef.current
    if (!mountNode) return
    if (!permissionGranted) return // Esperamos a obtener el permiso para sensores

    const elements = []
    const DISTANCE = 5
    // Objeto para guardar los últimos datos de orientación
    const orientationData = { alpha: 0, beta: 0, gamma: 0 }

    // Crear la escena y la cámara
    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(
      75,
      // @ts-expect-error xxx
      mountRef.current.clientWidth / mountRef.current.clientHeight,
      0.1,
      1000
    )
    camera.position.set(0, 0, 0)

    // Configurar el renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true })
    // @ts-expect-error xxx
    renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight)
    // @ts-expect-error xxx
    mountRef.current.appendChild(renderer.domElement)

    // Generar los puntos en la esfera
    const sphereTransforms = getSphereTransforms(DISTANCE, 24)
    // Añadir los puntos a la escena
    sphereTransforms.forEach((cfg) => {
      // Crear una esfera para cada punto
      const geometry = new THREE.SphereGeometry(0.3, 16, 16)
      // Obtener el color basado en la posición
      const color = getColorFromPosition(cfg.pos)
      const material = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.5 })
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
    // @ts-expect-error xxx
    const handleOrientation = (event) => {
      // event.alpha, event.beta y event.gamma vienen en grados
      orientationData.alpha = event.alpha || 0
      orientationData.beta = event.beta || 0
      orientationData.gamma = event.gamma || 0
    }

    window.addEventListener('deviceorientation', handleOrientation, true)

    // Antes de la función animate, crea el quaternion de corrección
    const q1 = new THREE.Quaternion(-Math.sqrt(0.5), 0, 0, Math.sqrt(0.5))

    const animate = () => {
      requestAnimationFrame(animate)

      // Convertir a radianes (usamos solo alpha y beta, ignorando gamma)
      const alpha = THREE.MathUtils.degToRad(orientationData.alpha)
      const beta = THREE.MathUtils.degToRad(orientationData.beta)

      // Creamos un Euler con el orden "YXZ" (gamma lo dejamos en 0 para evitar el roll no deseado)
      const euler = new THREE.Euler(beta, alpha, 0, 'YXZ')
      const quaternion = new THREE.Quaternion()
      quaternion.setFromEuler(euler)

      // Aplicamos la corrección fija para alinear el dispositivo con la escena
      quaternion.multiply(q1)

      // Ajustamos la orientación según la orientación de la pantalla usando la Screen Orientation API
      const screenOrientationAngle =
        screen.orientation && screen.orientation.angle ? screen.orientation.angle : 0
      const screenOrientation = THREE.MathUtils.degToRad(screenOrientationAngle)
      const screenTransform = new THREE.Quaternion()
      screenTransform.setFromAxisAngle(new THREE.Vector3(0, 0, 1), -screenOrientation)
      quaternion.multiply(screenTransform)

      // Asignamos el quaternion resultante a la cámara
      camera.quaternion.copy(quaternion)

      // // Efecto flotante para los cuadrados (opcional)
      // const time = Date.now() * 0.002
      // // @ts-expect-error xxx
      // elements.forEach((plane) => {
      //   plane.position.y = plane.userData.initialPosition.y + Math.sin(time) * 0.2
      // })

      renderer.render(scene, camera)
    }

    animate()

    // Actualizar tamaño al redimensionar
    const onWindowResize = () => {
      // @ts-expect-error xxx
      camera.aspect = mountRef.current.clientWidth / mountRef.current.clientHeight
      camera.updateProjectionMatrix()
      // @ts-expect-error xxx
      renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight)
    }
    window.addEventListener('resize', onWindowResize)

    // Cleanup al desmontar
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
