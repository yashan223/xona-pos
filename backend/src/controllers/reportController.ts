import { Request, Response } from 'express';
import store from '../persistence/store.js';
import reportRepository from '../repositories/reportRepository.js';
import { UserModel, ProductModel, CustomerModel, TransactionModel, GraphNodeModel, GraphEdgeModel } from '../persistence/database.js';
import { runSeed } from '../seed.js';

class ReportController {
  getPopularProducts = async (req: Request, res: Response) => {
    try {
      const products = await reportRepository.getPopularProducts();
      res.json(products);
    } catch (err) {
      console.error('[reports] popular-products error:', err);
      res.status(500).json({ error: 'Failed to get popular products' });
    }
  };

  getEffectiveProducts = async (req: Request, res: Response) => {
    try {
      const products = reportRepository.getEffectiveProducts(20);
      res.json(products);
    } catch (err) {
      console.error('[reports] effective-products error:', err);
      res.status(500).json({ error: 'Failed to get effective products' });
    }
  };

  getPOSPatterns = async (req: Request, res: Response) => {
    try {
      const patterns = await reportRepository.getPOSPatterns();
      res.json(patterns);
    } catch (err) {
      console.error('[reports] pos-patterns error:', err);
      res.status(500).json({ error: 'Failed to get POS patterns' });
    }
  };

  getTimeline = async (req: Request, res: Response) => {
    try {
      const timeline = await reportRepository.getTimeline(50);
      res.json(timeline);
    } catch (err) {
      console.error('[reports] timeline error:', err);
      res.status(500).json({ error: 'Failed to get timeline' });
    }
  };

  getStats = async (req: Request, res: Response) => {
    try {
      const stats = await reportRepository.getStats();
      res.json(stats);
    } catch (err) {
      console.error('[reports] stats error:', err);
      res.status(500).json({ error: 'Failed to get stats' });
    }
  };

  clearDatabase = async (req: Request, res: Response) => {
    try {
      // 1. Clear Mongoose collections
      await UserModel.deleteMany({ username: { $ne: 'admin' } });
      await ProductModel.deleteMany({});
      await TransactionModel.deleteMany({});
      await CustomerModel.deleteMany({});
      await GraphNodeModel.deleteMany({});
      await GraphEdgeModel.deleteMany({});

      // 2. Reload in-memory structures (which will clear them)
      await store.loadAll();

      res.json({ message: 'Database cleared successfully (admin user retained)' });
    } catch (err) {
      console.error('[reports] clear database error:', err);
      res.status(500).json({ error: 'Failed to clear database' });
    }
  };

  resetDatabase = async (req: Request, res: Response) => {
    try {
      // 1. Clear database
      await UserModel.deleteMany({ username: { $ne: 'admin' } });
      await ProductModel.deleteMany({});
      await TransactionModel.deleteMany({});
      await CustomerModel.deleteMany({});
      await GraphNodeModel.deleteMany({});
      await GraphEdgeModel.deleteMany({});

      // 2. Run seed logic
      await runSeed();

      // 3. Reload in-memory structures from the newly seeded database
      await store.loadAll();

      res.json({ message: 'Database reset and seeded successfully' });
    } catch (err) {
      console.error('[reports] reset database error:', err);
      res.status(500).json({ error: 'Failed to reset database' });
    }
  };
}

export const reportController = new ReportController();
export default reportController;
