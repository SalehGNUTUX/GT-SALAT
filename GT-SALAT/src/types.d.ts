import type { GtSalatApi } from '@electron/preload';

declare global {
  interface Window {
    gtSalat: GtSalatApi;
  }
}

declare module '*.png' {
  const src: string;
  export default src;
}

declare module '*.svg' {
  const src: string;
  export default src;
}

export {};
