/// <reference types="vite/client" />

declare const MAIN_WINDOW_VITE_DEV_SERVER_URL: string;
declare const MAIN_WINDOW_VITE_NAME: string;
declare module 'electron-squirrel-startup' {
  const started: boolean;
  export default started;
}

interface Window {
  electronDB?: {
    readPermanentFile: (key: string) => Promise<string | null>;
    writePermanentFile: (key: string, data: string) => Promise<boolean>;
    getDbPath: () => Promise<string>;
    setDbPath: (dirPath: string) => Promise<{ success: boolean; error?: string }>;
    browseDbFolder: () => Promise<string | null>;
  };
  electronPrinter?: {
    listPrinters: () => Promise<string[]>;
    printNetwork: (config: { ip: string; port: number }, receipt: any) => Promise<{ success: boolean; error?: string }>;
    printQueue: (printerName: string, receipt: any) => Promise<{ success: boolean; error?: string }>;
    printSerial: (config: { port: string; baud: number }, receipt: any) => Promise<{ success: boolean; error?: string }>;
  };
  electronConfig?: {
    get: (key: string) => any;
    set: (key: string, value: any) => void;
    getAll: () => Record<string, any>;
  };
  electronApp?: {
    onBeforeClose: (callback: () => void) => void;
    getRunOnStartup: () => Promise<boolean>;
    setRunOnStartup: (enabled: boolean) => Promise<boolean>;
    toggleFullscreen: () => Promise<boolean>;
  };
}
