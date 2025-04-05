import { useEffect } from 'react'
import * as THREE from 'three'
import { getSphereTransforms, positionToHSL } from './utils'
import { DISTANCE, SPHERE_COUNT, SPHERE_OPACITY, SPHERE_RADIUS, SPHERE_SEGMENTS } from './constants'
import { useApp } from './contexts/app-context/hook'
import PhotoCaptureButton from './components/photo-capture-button'
import EnableSensorsButton from './components/enable-sensors-button'
import PhotoDownloaderButton from './components/photo-downloader-button'
import FocusRing from './components/focus-ring'
import AutoCaptureNotifier from './components/auto-capture-notifier'

export default function ThreeScene() {
  // Extraemos las referencias y métodos necesarios del contexto de la aplicación.
  const { mountRef, rendererRef, permissionGranted, setCurrentScene, setCurrentCamera } = useApp()

  useEffect(() => {
    // Se obtiene el elemento DOM donde se renderizará la escena.
    const mountNode = mountRef.current
    if (!mountNode) return
    // Si aún no se han concedido los permisos necesarios (por ejemplo, para acceder a la cámara), se detiene la ejecución.
    if (!permissionGranted) return

    // ---------------------------
    // CREACIÓN DE LA ESCENA Y LA CÁMARA
    // ---------------------------
    // Se crea una nueva escena de Three.js.
    const scene = new THREE.Scene()
    // Se guarda la escena actual en el contexto global.
    setCurrentScene(scene)
    // Se crea una cámara con perspectiva. Los parámetros son:
    // - Ángulo de visión (75°)
    // - Relación de aspecto (ancho / alto del contenedor)
    // - Distancia mínima (0.1) y máxima (1000) de renderizado
    const camera = new THREE.PerspectiveCamera(
      75,
      mountNode.clientWidth / mountNode.clientHeight,
      0.1,
      1000
    )
    // Posiciona la cámara en el origen (0, 0, 0).
    camera.position.set(0, 0, 0)
    // Se guarda la cámara actual en el contexto global.
    setCurrentCamera(camera)

    // ---------------------------
    // CONFIGURACIÓN DEL RENDERER
    // ---------------------------
    // Se crea un renderizador WebGL con antialiasing para suavizar bordes.
    const renderer = new THREE.WebGLRenderer({ antialias: true })
    // Se ajusta el tamaño del renderer según el contenedor.
    renderer.setSize(mountNode.clientWidth, mountNode.clientHeight)
    // Se añade el canvas del renderer al DOM.
    mountNode.appendChild(renderer.domElement)
    // Se guarda la referencia del renderer para un uso posterior.
    rendererRef.current = renderer

    // ---------------------------
    // CREACIÓN Y AGREGADO DE ESFERAS A LA ESCENA
    // ---------------------------
    // Se obtienen las transformaciones para cada esfera (posición, id, etc.)
    const sphereTransforms = getSphereTransforms(DISTANCE, SPHERE_COUNT)
    sphereTransforms.forEach((cfg) => {
      // Extraer las coordenadas de la posición
      const [x, y, z] = cfg.pos
      // Crear la geometría de la esfera con el radio y segmentos definidos.
      const geometry = new THREE.SphereGeometry(SPHERE_RADIUS, SPHERE_SEGMENTS, SPHERE_SEGMENTS)
      // Convertir la posición en un color usando la función positionToHSL.
      const color = positionToHSL(x / DISTANCE, y / DISTANCE, z / DISTANCE)
      // Crear el material de la esfera con transparencia y opacidad definidas.
      const material = new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: SPHERE_OPACITY,
      })
      // Crear la malla combinando la geometría y el material.
      const sphere = new THREE.Mesh(geometry, material)
      // Posicionar la esfera en las coordenadas obtenidas.
      sphere.position.set(x, y, z)

      // Agregar metadatos personalizados a la esfera (por ejemplo, un id).
      sphere.userData = {
        id: cfg.id,
      }

      // Añadir la esfera a la escena.
      scene.add(sphere)
    })

    // ---------------------------
    // AGREGAR VIDEO DE FONDO DE LA CÁMARA
    // ---------------------------
    // Se crea un elemento de video que actuará como textura de fondo.
    const video = document.createElement('video')
    video.autoplay = true
    video.playsInline = true
    video.muted = true
    // Se solicita el stream de video de la cámara trasera (environment)
    navigator.mediaDevices
      .getUserMedia({
        video: { facingMode: { exact: 'environment' } },
      })
      .then((stream) => {
        // Asignar el stream al elemento video y reproducirlo.
        video.srcObject = stream
        video.play()
        // Crear una textura de video para Three.js.
        const videoTexture = new THREE.VideoTexture(video)
        videoTexture.minFilter = THREE.LinearFilter
        videoTexture.magFilter = THREE.LinearFilter
        videoTexture.format = THREE.RGBFormat
        // Asignar la textura de video como fondo de la escena.
        scene.background = videoTexture
      })
      .catch((err) => {
        console.error('Error al acceder a la cámara:', err)
      })

    // ---------------------------
    // CONFIGURAR LA ORIENTACIÓN DEL DISPOSITIVO
    // ---------------------------
    // Variables para almacenar los ángulos de orientación en radianes.
    let alpha = 0,
      beta = 0,
      gamma = 0

    // Objeto Euler para transformar los ángulos a una rotación.
    const euler = new THREE.Euler()
    // Quaternion que se obtendrá a partir del Euler para aplicar a la cámara.
    const deviceQuaternion = new THREE.Quaternion()
    // Quaternion de corrección para alinear el sistema de referencia del dispositivo con el de Three.js.
    // Se rota alrededor del eje X para compensar la diferencia de referencia.
    const q1 = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 2)

    // Función para manejar el evento de orientación del dispositivo.
    // Se actualizan los valores alpha, beta y gamma, se crean el objeto Euler y el Quaternion, y se aplica la corrección.
    const handleOrientation = (event: DeviceOrientationEvent) => {
      // Si no se reciben los tres valores, se termina la ejecución de la función.
      if (event.alpha === null || event.beta === null || event.gamma === null) return

      // Convertir los valores de grados a radianes.
      alpha = THREE.MathUtils.degToRad(event.alpha)
      beta = THREE.MathUtils.degToRad(event.beta)
      gamma = THREE.MathUtils.degToRad(event.gamma)

      // Configurar el Euler con los ángulos en el orden 'YXZ' para evitar efectos inesperados.
      euler.set(beta, alpha, -gamma, 'YXZ')
      // Crear el Quaternion a partir del Euler.
      deviceQuaternion.setFromEuler(euler)
      // Aplicar la corrección para alinear correctamente el sistema de referencia.
      deviceQuaternion.multiply(q1)
      // Actualizar la rotación de la cámara con el Quaternion calculado.
      camera.quaternion.copy(deviceQuaternion)
    }

    // Añadir el listener para el evento 'deviceorientation'
    window.addEventListener('deviceorientation', handleOrientation, true)

    // ---------------------------
    // LOOP DE ANIMACIÓN
    // ---------------------------
    // Función que se llama recursivamente para renderizar la escena en cada frame.
    const animate = () => {
      requestAnimationFrame(animate)
      renderer.render(scene, camera)
    }
    animate()

    // ---------------------------
    // GESTIÓN DEL REDIMENSIONAMIENTO DE LA VENTANA
    // ---------------------------
    // Función para actualizar la relación de aspecto de la cámara y el tamaño del renderer cuando se redimensiona la ventana.
    const onWindowResize = () => {
      if (!mountNode) return
      camera.aspect = mountNode.clientWidth / mountNode.clientHeight
      camera.updateProjectionMatrix()
      renderer.setSize(mountNode.clientWidth, mountNode.clientHeight)
    }
    // Se añade el listener para el evento 'resize'.
    window.addEventListener('resize', onWindowResize)

    // ---------------------------
    // CLEANUP AL DESMONTAR EL COMPONENTE
    // ---------------------------
    // Se elimina el listener de la orientación y redimensión, y se limpia el DOM removiendo el canvas del renderer.
    return () => {
      window.removeEventListener('deviceorientation', handleOrientation, true)
      window.removeEventListener('resize', onWindowResize)
      if (mountNode && renderer.domElement) {
        mountNode.removeChild(renderer.domElement)
      }
    }
    // Se deshabilita la advertencia de dependencias faltantes en el useEffect.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [permissionGranted])

  // Renderiza los componentes de UI y el contenedor donde se renderiza la escena 3D.
  return (
    <>
      <AutoCaptureNotifier />
      <EnableSensorsButton />
      <PhotoCaptureButton />
      <PhotoDownloaderButton />
      <FocusRing />

      {/* Contenedor del renderer: ocupa toda la ventana */}
      <div ref={mountRef} style={{ width: '100vw', height: '100vh', overflow: 'hidden' }} />
    </>
  )
}
