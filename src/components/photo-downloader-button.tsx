import JSZip from 'jszip'
import { useApp } from '../contexts/app-context/hook'

export default function PhotoDownloaderButton() {
  const { photoFiles, photosLeft } = useApp()

  // Función para descargar las fotos
  const downloadPhotos = () => {
    if (photoFiles.length === 0) return

    // Crear una instancia de JSZip
    const zip = new JSZip()

    // Añadir cada foto al archivo ZIP
    photoFiles.forEach((file) => {
      zip.file(`${file.name}`, file)
    })

    // Generar el archivo ZIP y descargarlo
    zip.generateAsync({ type: 'blob' }).then((content) => {
      const url = URL.createObjectURL(content)
      const a = document.createElement('a')
      a.href = url
      a.download = 'photos.zip' // Nombre del archivo ZIP
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    })
  }

  if (photoFiles.length === 0 || photosLeft > 0) return null

  return (
    <button
      style={{
        position: 'absolute',
        zIndex: 2,
        bottom: '2rem',
        left: '50%',
        transform: 'translateX(-50%)',
        padding: '1rem',
        fontSize: '1.2rem',
      }}
      onClick={downloadPhotos}
    >
      Descargar Fotos
    </button>
  )
}
