import { type TSphereTransform } from "./types"

/**
 * Genera 'n' puntos en la superficie de una esfera de radio 'r'.
 * Para cada punto se devuelve su posición en 3D y su rotación hacia el centro.
 *
 * @param r - Radio de la esfera
 * @param n - Cantidad de puntos
 * @returns Array de objetos { pos: [x, y, z], rot: [yaw, pitch, roll] }
 */
export function getSphereTransforms(r: number, n: number): TSphereTransform[] {
  const puntos: TSphereTransform[] = []
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
export function getColorFromPosition(pos: [number, number, number]): string {
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
