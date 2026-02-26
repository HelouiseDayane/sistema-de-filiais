interface ImportMetaEnv {
  VITE_API_BASE_URL: string;
  VITE_DOMAIN_BASE_URL: string;
  // adicione outras variáveis que você usa
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}