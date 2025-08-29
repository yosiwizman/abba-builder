/// <reference types="vite/client" />

// CSS Module declarations
declare module '*.css' {
  const content: { [className: string]: string };
  export default content;
}

// Add specific CSS file declarations
declare module './styles/globals.css';
declare module './styles/fallback.css';
declare module './styles/emergency-fix.css';

// Environment variables
interface ImportMetaEnv {
  readonly MODE: 'development' | 'production' | 'test';
  readonly PROD: boolean;
  readonly DEV: boolean;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}