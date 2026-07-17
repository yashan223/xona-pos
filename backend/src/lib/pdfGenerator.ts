import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';

export async function generateReceiptPDF(transaction: any): Promise<string> {
  return new Promise((resolve, reject) => {
    try {
      // Get date string (YYYY-MM-DD)
      const dateStr = transaction.createdAt ? transaction.createdAt.split('T')[0] : new Date().toISOString().split('T')[0];
      const directoryPath = path.join(process.cwd(), 'receipts', dateStr);
      
      // Ensure directory exists
      if (!fs.existsSync(directoryPath)) {
        fs.mkdirSync(directoryPath, { recursive: true });
      }
      
      const fileName = `receipt-${transaction.id || transaction._id}.pdf`;
      const filePath = path.join(directoryPath, fileName);
      
      const doc = new PDFDocument({ 
        size: 'A6', 
        margins: { top: 12, bottom: 12, left: 12, right: 12 } 
      });
      const stream = fs.createWriteStream(filePath);
      
      doc.pipe(stream);
      
      // Header branding
      doc.fontSize(14).text('XONA POS', { align: 'center', underline: false });
      doc.fontSize(7).text('123 Retail Business Way, City', { align: 'center' });
      doc.text('Tel: (555) 123-4567', { align: 'center' });
      doc.moveDown(0.5);
      
      // Receipt metadata
      doc.fontSize(6);
      doc.text(`Receipt ID: ${transaction.id || transaction._id}`);
      doc.text(`Date: ${new Date(transaction.createdAt || new Date()).toLocaleString()}`);
      doc.text(`Cashier ID: ${transaction.cashierId}`);
      if (transaction.customerId) {
        doc.text(`Customer ID: ${transaction.customerId}`);
      }
      doc.moveDown(0.5);
      
      // Items list table
      doc.fontSize(7).text('----------------------------------------------------');
      doc.text('Item                   Qty   Price     Total');
      doc.text('----------------------------------------------------');
      
      // Items rendering
      doc.fontSize(6);
      for (const item of transaction.items) {
        const nameCol = item.name.substring(0, 20).padEnd(22);
        const qtyCol = String(item.quantity).padStart(3);
        const priceCol = `Rs.${Number(item.price).toFixed(2)}`.padStart(11);
        const totalCol = `Rs.${Number(item.subtotal).toFixed(2)}`.padStart(12);
        doc.text(`${nameCol}${qtyCol}${priceCol}${totalCol}`);
      }
      
      doc.fontSize(7).text('----------------------------------------------------');
      
      // Summary calculations
      doc.fontSize(6);
      doc.text(`Subtotal:`.padEnd(28) + `Rs.${Number(transaction.subtotal).toFixed(2)}`.padStart(18));
      if (transaction.discount > 0) {
        doc.text(`Discount:`.padEnd(28) + `-Rs.${Number(transaction.discount).toFixed(2)}`.padStart(18));
      }
      doc.text(`Tax (8%):`.padEnd(28) + `Rs.${Number(transaction.tax).toFixed(2)}`.padStart(18));
      doc.font('Helvetica-Bold');
      doc.fontSize(7).text(`Total:`.padEnd(28) + `Rs.${Number(transaction.totalAmount).toFixed(2)}`.padStart(18));
      doc.font('Helvetica');
      
      doc.moveDown(0.5);
      doc.text('Payment: ' + String(transaction.paymentMethod).toUpperCase(), { align: 'center' });
      doc.text('Status: ' + String(transaction.paymentStatus).toUpperCase(), { align: 'center' });
      
      doc.moveDown(0.5);
      doc.fontSize(6).text('Thank you for shopping with us!', { align: 'center' });
      
      doc.end();
      
      stream.on('finish', () => {
        // Return relative path for download url access
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
