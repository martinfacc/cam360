import React from 'react'
import * as THREE from 'three'

export type TAppContext = {
  mountRef: React.RefObject<HTMLDivElement | null>
  rendererRef: React.MutableRefObject<THREE.WebGLRenderer | null>
  permissionGranted: boolean
  setPermissionGranted: React.Dispatch<React.SetStateAction<boolean>>
  currentScene: THREE.Scene | null
  setCurrentScene: React.Dispatch<React.SetStateAction<THREE.Scene | null>>
  currentCamera: THREE.PerspectiveCamera | null
  setCurrentCamera: React.Dispatch<React.SetStateAction<THREE.PerspectiveCamera | null>>
  photoFiles: File[]
  setPhotoFiles: React.Dispatch<React.SetStateAction<File[]>>
  photosLeft: number
  setPhotosLeft: React.Dispatch<React.SetStateAction<number>>
  overSphere: boolean
  setOverSphere: React.Dispatch<React.SetStateAction<boolean>>
}
