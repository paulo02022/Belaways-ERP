/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly BELAWAYS_SUPABASE_URL: string;
  readonly BELAWAYS_SUPABASE_ANON_KEY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
