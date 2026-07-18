import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronDB', {
  readPermanentFile: (key: string) => ipcRenderer.invoke('db-read-file', key),
  writePermanentFile: (key: string, data: string) => ipcRenderer.invoke('db-write-file', key, data),
});
