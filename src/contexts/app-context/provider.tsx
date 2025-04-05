import { useRef, useState, ReactNode, useMemo } from 'react'
import * as THREE from 'three'
import { SPHERE_COUNT } from '../../constants'
import { AppContext } from './context'

export const AppProvider = (props: { children: ReactNode }) => {
  const { children } = props
  const mountRef = useRef<HTMLDivElement>(null)
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
  const [permissionGranted, setPermissionGranted] = useState(false)
  const [currentScene, setCurrentScene] = useState<THREE.Scene | null>(null)
  const [currentCamera, setCurrentCamera] = useState<THREE.PerspectiveCamera | null>(null)
  const [photoFiles, setPhotoFiles] = useState<File[]>([])
  const [photosLeft, setPhotosLeft] = useState<number>(SPHERE_COUNT)
  const [overSphere, setOverSphere] = useState(false)

  const values = useMemo(
    () => ({
      mountRef,
      rendererRef,
      permissionGranted,
      setPermissionGranted,
      currentScene,
      setCurrentScene,
      currentCamera,
      setCurrentCamera,
      photoFiles,
      setPhotoFiles,
      photosLeft,
      setPhotosLeft,
      overSphere,
      setOverSphere,
    }),
    [
      mountRef,
      rendererRef,
      permissionGranted,
      currentScene,
      currentCamera,
      photoFiles,
      photosLeft,
      overSphere,
    ]
  )

  return <AppContext.Provider value={values}>{children}</AppContext.Provider>
}
