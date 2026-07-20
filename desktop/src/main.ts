import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import path from 'node:path';
import fs from 'node:fs';
import net from 'node:net';
import started from 'electron-squirrel-startup';
if (started) {
  app.quit();
}
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


const getConfigFile = () => {
  const dir = getCustomDbDir() ?? app.getPath('userData');
  return path.join(dir, 'xona_config.json');
};

function loadConfig() {
  try {
    const file = getConfigFile();
    if (fs.existsSync(file)) {
      return JSON.parse(fs.readFileSync(file, 'utf-8'));
    }
  } catch (err) {
    console.error('[Config] Failed to load config:', err);
  }
  return {};
}

function saveConfig(config: any) {
  try {
    const file = getConfigFile();
    fs.writeFileSync(file, JSON.stringify(config, null, 2), 'utf-8');
  } catch (err) {
    console.error('[Config] Failed to save config:', err);
  }
}

ipcMain.on('config-get', (event, key: string) => {
  const config = loadConfig();
  event.returnValue = config[key];
});

ipcMain.on('config-get-all', (event) => {
  event.returnValue = loadConfig();
});

ipcMain.on('config-set', (event, key: string, value: any) => {
  const config = loadConfig();
  config[key] = value;
  saveConfig(config);
  event.returnValue = true;
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
interface ReceiptData {
  storeName: string;
  storeAddress: string;
  receiptId: string;
  cashier: string;
  date: string;
  items: { name: string; quantity: number; price: number; subtotal: number }[];
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  paymentMethod: string;
  paperWidth: 48 | 32;
}
function buildReceiptBuffer(data: ReceiptData): Buffer {
  const W = data.paperWidth; 
  const chunks: Buffer[] = [];
  const push = (...bytes: number[]) => chunks.push(Buffer.from(bytes));
  const text = (s: string) => chunks.push(Buffer.from(s, 'latin1'));
  const lf = () => push(0x0a);
  const init = () => push(0x1b, 0x40);
  const alignCenter = () => push(0x1b, 0x61, 0x01);
  const alignLeft = () => push(0x1b, 0x61, 0x00);
  const alignRight = () => push(0x1b, 0x61, 0x02);
  const boldOn = () => push(0x1b, 0x45, 0x01);
  const boldOff = () => push(0x1b, 0x45, 0x00);
  const doubleSize = () => push(0x1d, 0x21, 0x11);
  const normalSize = () => push(0x1d, 0x21, 0x00);
  const fullCut = () => push(0x1d, 0x56, 0x41, 0x00);
  const hLine = (c = '-') => text(c.repeat(W) + '\n');
  const padRow = (left: string, right: string) => {
    const gap = W - left.length - right.length;
    return left + (gap > 0 ? ' '.repeat(gap) : ' ') + right;
  };
  const centeredStr = (s: string) => {
    const p = Math.max(0, Math.floor((W - s.length) / 2));
    return ' '.repeat(p) + s;
  };
  init();
  alignCenter();
  boldOn(); doubleSize();
  text(centeredStr(data.storeName.substring(0, Math.floor(W / 2))) + '\n');
  normalSize(); boldOff();
  if (data.storeAddress) text(centeredStr(data.storeAddress.substring(0, W)) + '\n');
  lf();
  alignLeft();
  hLine();
  text(`Receipt : ${data.receiptId}\n`);
  text(`Date    : ${data.date}\n`);
  text(`Cashier : ${data.cashier}\n`);
  hLine();
  boldOn();
  text(padRow('ITEM', 'AMOUNT') + '\n');
  boldOff();
  hLine('-');
  for (const item of data.items) {
    const label = `${item.name.substring(0, W - 8)} x${item.quantity}`;
    text(label + '\n');
    alignRight();
    text(`Rs.${item.subtotal.toFixed(2)}\n`);
    alignLeft();
  }
  hLine();
  text(padRow('Subtotal:', `Rs.${data.subtotal.toFixed(2)}`) + '\n');
  if (data.discount > 0) {
    text(padRow('Discount:', `-Rs.${data.discount.toFixed(2)}`) + '\n');
  }
  if (data.tax > 0) {
    text(padRow('VAT:', `Rs.${data.tax.toFixed(2)}`) + '\n');
  }
  hLine('=');
  boldOn(); doubleSize();
  text(padRow('TOTAL:', `Rs.${data.total.toFixed(2)}`) + '\n');
  normalSize(); boldOff();
  hLine('=');
  text(padRow('Payment:', data.paymentMethod.toUpperCase()) + '\n');
  lf(); lf();
  alignCenter();
  text('Thank you for your purchase!\n');
  lf(); lf(); lf();
  fullCut();
  return Buffer.concat(chunks);
}
function buildReceiptHtml(data: ReceiptData): string {
  const pageW = data.paperWidth === 48 ? '80mm' : '58mm';
  const itemRows = data.items
    .map(
      (i) => `<tr>
        <td style="padding:1px 0;">${i.name} <span style="color:#666">x${i.quantity}</span></td>
        <td style="text-align:right;padding:1px 0;">Rs.${i.subtotal.toFixed(2)}</td>
      </tr>`
    )
    .join('');
  return `<!DOCTYPE html><html><head><meta charset="utf-8">
<style>
  @page { size: ${pageW} auto; margin: 4mm 3mm; }
  * { box-sizing: border-box; }
  body { font-family: 'Courier New', monospace; font-size: 10px; width: 100%; margin: 0; }
  h1 { font-size: 14px; text-align: center; margin: 0 0 2px; }
  .sub { text-align: center; font-size: 9px; color: #444; margin: 0 0 6px; }
  .hr { border-top: 1px dashed #000; margin: 4px 0; }
  .hr-solid { border-top: 1px solid #000; margin: 4px 0; }
  table { width: 100%; border-collapse: collapse; }
  td { vertical-align: top; font-size: 9px; }
  .meta td { padding: 0; }
  .meta td:last-child { text-align: right; }
  .total { font-weight: bold; font-size: 13px; }
  .center { text-align: center; }
  .footer { text-align: center; font-size: 9px; margin-top: 8px; color:#444; }
</style></head><body>
  <h1>${data.storeName}</h1>
  ${data.storeAddress ? `<p class="sub">${data.storeAddress}</p>` : ''}
  <div class="hr-solid"></div>
  <table class="meta">
    <tr><td>Receipt</td><td>${data.receiptId}</td></tr>
    <tr><td>Date</td><td>${data.date}</td></tr>
    <tr><td>Cashier</td><td>${data.cashier}</td></tr>
  </table>
  <div class="hr"></div>
  <table>${itemRows}</table>
  <div class="hr"></div>
  <table class="meta">
    <tr><td>Subtotal</td><td>Rs.${data.subtotal.toFixed(2)}</td></tr>
    ${data.discount > 0 ? `<tr><td>Discount</td><td>-Rs.${data.discount.toFixed(2)}</td></tr>` : ''}
    ${data.tax > 0 ? `<tr><td>VAT</td><td>Rs.${data.tax.toFixed(2)}</td></tr>` : ''}
  </table>
  <div class="hr-solid"></div>
  <table class="meta">
    <tr class="total"><td>TOTAL</td><td>Rs.${data.total.toFixed(2)}</td></tr>
    <tr><td>Payment</td><td>${data.paymentMethod.toUpperCase()}</td></tr>
  </table>
  <p class="footer">Thank you for your purchase!</p>
</body></html>`;
}
/** List Windows print queues */
ipcMain.handle('printer-list', async () => {
  try {
    const wins = BrowserWindow.getAllWindows();
    if (wins.length === 0) return [];
    const printers = await wins[0].webContents.getPrintersAsync();
    return printers.map((p) => p.name);
  } catch {
    return [];
  }
});
/** Print via TCP/IP network socket (ESC/POS) */
ipcMain.handle('printer-print-network', async (_e, config: { ip: string; port: number }, receipt: ReceiptData) => {
  return new Promise<{ success: boolean; error?: string }>((resolve) => {
    try {
      const buf = buildReceiptBuffer(receipt);
      const socket = net.createConnection({ host: config.ip, port: config.port });
      socket.setTimeout(5000);
      socket.on('connect', () => {
        socket.write(buf, () => { socket.end(); resolve({ success: true }); });
      });
      socket.on('timeout', () => {
        socket.destroy();
        resolve({ success: false, error: `Connection to ${config.ip}:${config.port} timed out` });
      });
      socket.on('error', (err) => resolve({ success: false, error: err.message }));
    } catch (err: any) {
      resolve({ success: false, error: err.message });
    }
  });
});
/** Print via Windows print queue (silent, uses receipt HTML) */
ipcMain.handle('printer-print-queue', async (_e, printerName: string, receipt: ReceiptData) => {
  return new Promise<{ success: boolean; error?: string }>((resolve) => {
    try {
      const html = buildReceiptHtml(receipt);
      const win = new BrowserWindow({
        show: false,
        webPreferences: { javascript: true, nodeIntegration: false },
      });
      win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
      win.webContents.once('did-finish-load', () => {
        win.webContents.print(
          { silent: true, deviceName: printerName || '', printBackground: true },
          (success: boolean, reason: string) => {
            win.destroy();
            if (success) resolve({ success: true });
            else resolve({ success: false, error: reason || 'Print failed' });
          }
        );
      });
    } catch (err: any) {
      resolve({ success: false, error: err.message });
    }
  });
});
/** Print via Serial/COM port (ESC/POS raw bytes) */
ipcMain.handle('printer-print-serial', async (_e, config: { port: string; baud: number }, receipt: ReceiptData) => {
  return new Promise<{ success: boolean; error?: string }>((resolve) => {
    try {
      const buf = buildReceiptBuffer(receipt);
      const portPath = config.port.match(/^COM\d+$/i)
        ? `\\\\.\\${config.port}`
        : config.port;
      fs.open(portPath, fs.constants.O_RDWR | fs.constants.O_NOCTTY, (openErr, fd) => {
        if (openErr) return resolve({ success: false, error: `Cannot open ${config.port}: ${openErr.message}` });
        fs.write(fd, buf, (writeErr) => {
          fs.close(fd, () => {});
          if (writeErr) resolve({ success: false, error: writeErr.message });
          else resolve({ success: true });
        });
      });
    } catch (err: any) {
      resolve({ success: false, error: err.message });
    }
  });
});
const createWindow = () => {
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 720,
    autoHideMenuBar: true,
    icon: path.join(__dirname, process.platform === 'win32' ? '../../assets/icon.ico' : '../../assets/icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
    },
  });
  mainWindow.setMenu(null);
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
