import { Request, Response } from 'express';
import transactionRepository from '../repositories/transactionRepository.js';
import { generateReceiptPDF } from '../lib/pdfGenerator.js';

class TransactionController {
  create = async (req: Request, res: Response) => {
    try {
      const { cashierId, customerId, items, subtotal, discount, tax, totalAmount, paymentMethod } = req.body;

      if (!cashierId || !items || !Array.isArray(items) || items.length === 0 || totalAmount === undefined) {
        return res.status(400).json({ error: 'cashierId, items list and totalAmount are required' });
      }

      const tx = await transactionRepository.createTransaction({
        cashierId,
        customerId: customerId || null,
        items,
        subtotal: Number(subtotal || 0),
        discount: Number(discount || 0),
        tax: Number(tax || 0),
        totalAmount: Number(totalAmount),
        paymentMethod: paymentMethod || 'cash',
        paymentStatus: 'paid',
      });

      // Generate the PDF receipt automatically on backend
      const pdfUrl = await generateReceiptPDF(tx);

      res.status(201).json({
        ...tx,
        pdfUrl
      });
    } catch (err) {
      console.error('[transactions] POST error:', err);
      res.status(500).json({ error: 'Failed to record transaction' });
    }
  };

  getAll = async (req: Request, res: Response) => {
    try {
      const txs = await transactionRepository.getAllTransactions();
      res.json(txs);
    } catch (err) {
      console.error('[transactions] GET all error:', err);
      res.status(500).json({ error: 'Failed to retrieve transactions' });
    }
  };

  getById = async (req: Request, res: Response) => {
    try {
      const tx = await transactionRepository.getTransactionById(req.params.id as string);
      if (!tx) {
        return res.status(404).json({ error: 'Transaction not found' });
      }
      res.json(tx);
    } catch (err) {
      console.error('[transactions] GET by id error:', err);
      res.status(500).json({ error: 'Failed to retrieve transaction' });
    }
  };

  refund = async (req: Request, res: Response) => {
    try {
      const tx = await transactionRepository.refundTransaction(req.params.id as string);
      if (!tx) {
        return res.status(404).json({ error: 'Transaction not found or already refunded' });
      }
      res.json({ message: 'Transaction refunded successfully', transaction: tx });
    } catch (err) {
      console.error('[transactions] POST refund error:', err);
      res.status(500).json({ error: 'Refund process failed' });
    }
  };
}

export const transactionController = new TransactionController();
export default transactionController;
