/**
 * Printer Configuration Store � Xona POS Desktop
 * Manages POS printer settings and dispatches receipt print jobs
 * to the appropriate IPC channel (Network / Windows Queue / Serial).
 */
declare global {
  interface Window {
    electronPrinter?: {
      listPrinters: () => Promise<string[]>;
      printNetwork: (
        config: { ip: string; port: number },
        receipt: ReceiptPayload
      ) => Promise<{ success: boolean; error?: string }>;
      printQueue: (
        printerName: string,
        receipt: ReceiptPayload
      ) => Promise<{ success: boolean; error?: string }>;
      printSerial: (
        config: { port: string; baud: number },
        receipt: ReceiptPayload
      ) => Promise<{ success: boolean; error?: string }>;
    };
  }
}
export type PrintMethod = 'network' | 'queue' | 'serial';
export interface PrinterConfig {
  enabled: boolean;
  method: PrintMethod;
  networkIp: string;
  networkPort: number;
  queueName: string;
  serialPort: string;
  serialBaud: number;
  paperWidth: 48 | 32;
  storeName: string;
  storeAddress: string;
  autoPrint: boolean;
}
export interface ReceiptPayload {
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
const CONFIG_KEY = 'xona_printer_config';
const DEFAULTS: PrinterConfig = {
  enabled: false,
  method: 'network',
  networkIp: '192.168.1.100',
  networkPort: 9100,
  queueName: '',
  serialPort: 'COM3',
  serialBaud: 9600,
  paperWidth: 48,
  storeName: 'Xona POS',
  storeAddress: '',
  autoPrint: false,
};
export function getPrinterConfig(): PrinterConfig {
  try {
    const raw = localStorage.getItem(CONFIG_KEY);
    return raw ? { ...DEFAULTS, ...JSON.parse(raw) } : { ...DEFAULTS };
  } catch {
    return { ...DEFAULTS };
  }
}
export function savePrinterConfig(partial: Partial<PrinterConfig>): void {
  const current = getPrinterConfig();
  localStorage.setItem(CONFIG_KEY, JSON.stringify({ ...current, ...partial }));
}
export async function listWindowsPrinters(): Promise<string[]> {
  if (!window.electronPrinter) return [];
  return window.electronPrinter.listPrinters();
}
export function buildReceiptPayload(
  tx: {
    id: string;
    cashierId: string;
    createdAt: string;
    items: { name: string; quantity: number; price: number; subtotal: number }[];
    subtotal: number;
    discount: number;
    tax: number;
    totalAmount: number;
    paymentMethod: string;
  },
  config: PrinterConfig
): ReceiptPayload {
  return {
    storeName: config.storeName || 'Xona POS',
    storeAddress: config.storeAddress || '',
    receiptId: tx.id,
    cashier: tx.cashierId,
    date: new Date(tx.createdAt).toLocaleString(),
    items: tx.items.map((i) => ({
      name: i.name,
      quantity: i.quantity,
      price: i.price,
      subtotal: i.subtotal,
    })),
    subtotal: tx.subtotal,
    discount: tx.discount,
    tax: tx.tax,
    total: tx.totalAmount,
    paymentMethod: tx.paymentMethod,
    paperWidth: config.paperWidth,
  };
}
export async function printReceipt(
  tx: Parameters<typeof buildReceiptPayload>[0]
): Promise<{ success: boolean; error?: string }> {
  const config = getPrinterConfig();
  if (!config.enabled) {
    return { success: false, error: 'Printer is not enabled in Settings.' };
  }
  if (!window.electronPrinter) {
    return { success: false, error: 'Printer IPC bridge not available.' };
  }
  const payload = buildReceiptPayload(tx, config);
  switch (config.method) {
    case 'network':
      return window.electronPrinter.printNetwork(
        { ip: config.networkIp, port: config.networkPort },
        payload
      );
    case 'queue':
      return window.electronPrinter.printQueue(config.queueName, payload);
    case 'serial':
      return window.electronPrinter.printSerial(
        { port: config.serialPort, baud: config.serialBaud },
        payload
      );
    default:
      return { success: false, error: 'Unknown print method configured.' };
  }
}
