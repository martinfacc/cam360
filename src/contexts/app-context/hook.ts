import { useContext } from "react"
import { type TAppContext } from "./types"
import { AppContext } from "./context"

export const useApp = (): TAppContext => {
  const context = useContext(AppContext)
  if (!context) {
    throw new Error('useApp debe usarse dentro de un AppProvider')
  }
  return context
}
