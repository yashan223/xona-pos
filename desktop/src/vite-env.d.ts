/// <reference types="vite/client" />
declare const MAIN_WINDOW_VITE_DEV_SERVER_URL: string;
declare const MAIN_WINDOW_VITE_NAME: string;
declare module 'electron-squirrel-startup' {
  const started: boolean;
  export default started;
}

declare global {
  interface Window {
    electronPrinter?: {
      listPrinters: () => Promise<string[]>;
      printNetwork: (config: { ip: string; port: number }, receipt: unknown) => Promise<{ success: boolean; error?: string }>;
      printQueue: (printerName: string, receipt: unknown) => Promise<{ success: boolean; error?: string }>;
      printSerial: (config: { port: string; baud: number }, receipt: unknown) => Promise<{ success: boolean; error?: string }>;
    };
    electronConfig?: {
      get: (key: string) => any;
      set: (key: string, value: any) => void;
      getAll: () => Record<string, any>;
    };
  }
}
