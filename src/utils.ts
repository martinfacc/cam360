import { type TSphereTransform } from "./types"

/**
 * Genera un UUIDv4 (Universally Unique Identifier) de 128 bits.
 * Este ID es único y se utiliza para identificar de manera única cada punto en la esfera.
 *
 * @returns Un string que representa el ID único.
 */
export function generateUniqueId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0
    const v = c === 'x' ? r : (r & 0x3 | 0x8)
    return v.toString(16)
  })
}

/**
 * Genera 'n' puntos en la superficie de una esfera de radio 'r'.
 * Para cada punto se devuelve su posición en 3D con un ID único.
 *
 * @param r - Radio de la esfera
 * @param n - Cantidad de puntos
 * @returns Array de objetos { id, pos: [x, y, z] }
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
    const id = generateUniqueId()

    puntos.push({ id, pos })
  }

  return puntos
}

/**
 * The function `positionToHSL` converts 3D coordinates into an HSL color value.
 * @param x - The `x`, `y`, and `z` parameters represent the normalized coordinates in a 3D space. The
 * values should be between -1 and 1, where:
 * @param y - The `y` parameter in the `positionToHSL` function represents the vertical position in a
 * 3D space. It is used to calculate the hue value for the HSL color based on its interpolation between
 * yellow and blue (60 to 240 degrees).
 * @param z - The `z` parameter in the `positionToHSL` function represents the position along the
 * Z-axis in a 3D space. This function takes three parameters `x`, `y`, and `z`, which are the
 * coordinates in a 3D space. The function then calculates the average
 * @returns The function `positionToHSL` takes three parameters `x`, `y`, and `z`, which represent
 * positions in a 3D space. It then calculates the average hue based on these positions and returns an
 * HSL color string with the calculated hue, a fixed saturation of 70%, and a lightness of 50%.
 */
export function positionToHSL(x: number, y: number, z: number): string {
  // Aseguramos que los valores estén entre -1 y 1
  x = Math.max(-1, Math.min(1, x));
  y = Math.max(-1, Math.min(1, y));
  z = Math.max(-1, Math.min(1, z));

  // Interpolación de hue para cada eje
  const hueX = ((x + 1) / 2) * 120;      // Rojo (0) ↔ Verde (120)
  const hueY = ((y + 1) / 2) * 180 + 60; // Amarillo (60) ↔ Azul (240)
  const hueZ = ((z + 1) / 2) * 120 + 300; // Magenta (300) ↔ Cian (180)
  const hueZWrapped = hueZ % 360;        // Asegura que no pase de 360°

  // Promedio circular
  const hues = [hueX, hueY, hueZWrapped];
  const radians = hues.map(h => h * Math.PI / 180);
  const avgSin = radians.reduce((sum, r) => sum + Math.sin(r), 0) / 3;
  const avgCos = radians.reduce((sum, r) => sum + Math.cos(r), 0) / 3;
  let avgHue = Math.atan2(avgSin, avgCos) * 180 / Math.PI;
  if (avgHue < 0) avgHue += 360;

  return `hsl(${avgHue.toFixed(2)}, 70%, 50%)`;
}
