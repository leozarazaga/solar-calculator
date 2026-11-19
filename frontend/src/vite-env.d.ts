/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Backend API base URL, e.g. http://localhost:3001/api */
  readonly VITE_API_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
