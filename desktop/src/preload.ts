import { contextBridge, ipcRenderer } from 'electron';
contextBridge.exposeInMainWorld('electronDB', {
  readPermanentFile: (key: string) => ipcRenderer.invoke('db-read-file', key),
  writePermanentFile: (key: string, data: string) => ipcRenderer.invoke('db-write-file', key, data),
  getDbPath: () => ipcRenderer.invoke('db-get-path'),
  setDbPath: (dirPath: string) => ipcRenderer.invoke('db-set-path', dirPath),
  browseDbFolder: () => ipcRenderer.invoke('db-browse-folder'),
});
contextBridge.exposeInMainWorld('electronConfig', {
  get: (key: string) => ipcRenderer.sendSync('config-get', key),
  set: (key: string, value: any) => ipcRenderer.sendSync('config-set', key, value),
  getAll: () => ipcRenderer.sendSync('config-get-all'),
});
contextBridge.exposeInMainWorld('electronPrinter', {
  listPrinters: () =>
    ipcRenderer.invoke('printer-list'),
  printNetwork: (config: { ip: string; port: number }, receipt: unknown) =>
    ipcRenderer.invoke('printer-print-network', config, receipt),
  printQueue: (printerName: string, receipt: unknown) =>
    ipcRenderer.invoke('printer-print-queue', printerName, receipt),
  printSerial: (config: { port: string; baud: number }, receipt: unknown) =>
    ipcRenderer.invoke('printer-print-serial', config, receipt),
});
