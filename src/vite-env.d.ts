/// <reference types="vite/client" />

declare module 'virtual:md/*' {
  const html: string;
  export default html;
}

interface ImportMetaEnv {
  readonly VITE_CALENDLY_URL?: string;
  readonly VITE_META_PIXEL_ID?: string;
  readonly VITE_HERO_PHOTO?: string;
  readonly VITE_HERO_A_ENABLED?: string;
  readonly VITE_PRIVACY_APPROVED?: string;
  readonly VITE_QUOTE_APPROVED?: string;
}
