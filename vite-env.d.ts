/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly REACT_APP_GEMINI_KEY: string
  readonly REACT_APP_GOOGLE_MAPS_KEY: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}