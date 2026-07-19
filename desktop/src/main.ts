import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import path from 'node:path';
import fs from 'node:fs';
import started from 'electron-squirrel-startup';

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (started) {
  app.quit();
}

// ─── Custom DB Path Config ────────────────────────────────────
const CONFIG_FILE = path.join(app.getPath('userData'), 'xona-db-config.json');

function getCustomDbDir(): string | null {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const config = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'));
      if (config.dbPath && fs.existsSync(config.dbPath)) {
        return config.dbPath;
      }
    }
  } catch (_) {}
  return null;
}

function setCustomDbDir(dirPath: string): void {
  fs.writeFileSync(CONFIG_FILE, JSON.stringify({ dbPath: dirPath }), 'utf-8');
}

const getStoragePath = (key: string) => {
  const customDir = getCustomDbDir();
  const storageDir = customDir ?? app.getPath('userData');
  if (!fs.existsSync(storageDir)) {
    fs.mkdirSync(storageDir, { recursive: true });
  }
  return path.join(storageDir, `${key}.json`);
};

// Permanent Disk File IPC Handlers
ipcMain.handle('db-read-file', async (_event, key: string) => {
  try {
    const filePath = getStoragePath(key);
    if (fs.existsSync(filePath)) {
      return fs.readFileSync(filePath, 'utf-8');
    }
  } catch (err) {
    console.error('[PermanentDB] Failed to read disk DB file:', err);
  }
  return null;
});

ipcMain.handle('db-write-file', async (_event, key: string, data: string) => {
  try {
    const filePath = getStoragePath(key);
    fs.writeFileSync(filePath, data, 'utf-8');
    return true;
  } catch (err) {
    console.error('[PermanentDB] Failed to write disk DB file:', err);
    return false;
  }
});

// ─── Custom DB Path IPC Handlers ─────────────────────────────
ipcMain.handle('db-get-path', async () => {
  const custom = getCustomDbDir();
  return custom ?? app.getPath('userData');
});

ipcMain.handle('db-set-path', async (_event, dirPath: string) => {
  try {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
    setCustomDbDir(dirPath);
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('db-browse-folder', async () => {
  const win = BrowserWindow.getFocusedWindow();
  const result = await dialog.showOpenDialog(win!, {
    title: 'Select Local Database Storage Folder',
    properties: ['openDirectory', 'createDirectory'],
  });
  if (result.canceled || result.filePaths.length === 0) return null;
  return result.filePaths[0];
});

const createWindow = () => {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 720,
    autoHideMenuBar: true,
    icon: path.join(__dirname, process.platform === 'win32' ? '../../assets/icon.ico' : '../../assets/icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  // Remove the default native menu bar
  mainWindow.setMenu(null);

  // and load the index.html of the app.
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`));
  }
};

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
