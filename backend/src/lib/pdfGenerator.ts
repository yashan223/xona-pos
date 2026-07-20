import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
export async function generateReceiptPDF(transaction: any): Promise<string> {
  return new Promise((resolve, reject) => {
    try {
      const dateStr = transaction.createdAt ? transaction.createdAt.split('T')[0] : new Date().toISOString().split('T')[0];
      const backendDir = process.cwd().endsWith('backend') ? process.cwd() : path.join(process.cwd(), 'backend');
      const directoryPath = path.join(backendDir, 'receipts', dateStr);
      if (!fs.existsSync(directoryPath)) {
        fs.mkdirSync(directoryPath, { recursive: true });
      }
      const fileName = `receipt-${transaction.id || transaction._id}.pdf`;
      const filePath = path.join(directoryPath, fileName);
      const doc = new PDFDocument({ 
        size: 'A6', 
        margins: { top: 20, bottom: 20, left: 36, right: 36 } 
      });
      const stream = fs.createWriteStream(filePath);
      doc.pipe(stream);
      doc.font('Courier');
      doc.font('Courier-Bold').fontSize(12).text('XONA POS', { align: 'center' });
      doc.font('Courier').fontSize(7).text('123 Retail Business Way, City', { align: 'center' });
      doc.text('Tel: (555) 123-4567', { align: 'center' });
      doc.moveDown(0.5);
      doc.fontSize(7);
      doc.text(`Receipt ID:  ${transaction.id || transaction._id}`);
      doc.text(`Date:        ${new Date(transaction.createdAt || new Date()).toLocaleString()}`);
      doc.text(`Cashier ID:  ${transaction.cashierId}`);
      if (transaction.customerId) {
        doc.text(`Customer ID: ${transaction.customerId}`);
      }
      doc.moveDown(0.5);
      doc.text('-------------------------------------------------');
      doc.font('Courier-Bold').text('Item                  Qty       Price       Total');
      doc.font('Courier').text('-------------------------------------------------');
      for (const item of transaction.items) {
        const nameCol = item.name.substring(0, 20).padEnd(22);
        const qtyCol = String(item.quantity).padStart(3);
        const priceCol = `Rs.${Number(item.price).toFixed(2)}`.padStart(12);
        const totalCol = `Rs.${Number(item.subtotal).toFixed(2)}`.padStart(12);
        doc.text(`${nameCol}${qtyCol}${priceCol}${totalCol}`);
      }
      doc.text('-------------------------------------------------');
      doc.text(`Subtotal:`.padEnd(28) + `Rs.${Number(transaction.subtotal).toFixed(2)}`.padStart(21));
      if (transaction.discount > 0) {
        doc.text(`Discount:`.padEnd(28) + `-Rs.${Number(transaction.discount).toFixed(2)}`.padStart(21));
      }
      doc.text(`VAT:`.padEnd(28) + `Rs.${Number(transaction.tax).toFixed(2)}`.padStart(21));
      doc.font('Courier-Bold');
      doc.text(`Total:`.padEnd(28) + `Rs.${Number(transaction.totalAmount).toFixed(2)}`.padStart(21));
      doc.font('Courier');
      doc.moveDown(0.5);
      doc.text('Payment: ' + String(transaction.paymentMethod).toUpperCase(), { align: 'center' });
      doc.text('Status: ' + String(transaction.paymentStatus).toUpperCase(), { align: 'center' });
      doc.moveDown(0.8);
      doc.font('Courier-Bold').text('Thank you for shopping with us!', { align: 'center' });
      doc.moveDown(0.8);
      doc.font('Courier').fontSize(6).text('Developed by xoxod33p', { align: 'center' });
      doc.end();
      stream.on('finish', () => {
        resolve(`/receipts/${dateStr}/${fileName}`);
      });
      stream.on('error', (err) => {
        reject(err);
      });
    } catch (err) {
      reject(err);
    }
  });
}
