declare namespace NodeJS {
  interface ProcessEnv {
    NEXT_PUBLIC_SUPABASE_URL?: string
    NEXT_PUBLIC_SUPABASE_ANON_KEY?: string
    NEXT_PUBLIC_SITE_URL?: string
  }
}

declare global {
  namespace JSX {
    interface IntrinsicElements {
      // allow any intrinsic element to avoid TS errors when React types aren't installed
      [elemName: string]: any
    }
  }
}

export {}

// Minimal ambient module declarations for Next.js server runtime used in app router
declare module 'next' {
  export type Metadata = Record<string, any>
}

// Ensure `process.env` is available in TS even without @types/node installed
declare const process: { env: NodeJS.ProcessEnv }

