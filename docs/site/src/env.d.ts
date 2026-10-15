/// <reference types="vite/client" />

declare const __APP_VERSION__: string
/** `app@v1.2.0 · api@v1.2.0 · docs@v1.0.0`, each linked to its tree (null without git). */
declare const __VERSIONS__: { name: string; version: string; label: string; href: string | null }[]
