import { Request, Response } from 'express';
import store from '../persistence/store.js';
import reportRepository from '../repositories/reportRepository.js';
import { UserModel, ProductModel, CustomerModel, TransactionModel, GraphNodeModel, GraphEdgeModel, SavedReportModel } from '../persistence/database.js';
import { runSeed } from '../seed.js';
import fs from 'fs';
import path from 'path';
import { generateSalesReportPDF } from '../lib/reportPdfGenerator.js';

const getBackupsDir = () => {
  const dir = path.join(process.cwd(), 'backups');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
};

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

  generatePdfReport = async (req: Request, res: Response) => {
    try {
      // Role enforcement check (Owner/Admin roles only)
      const userRole = (req.headers['x-user-role'] as string) || (req.query.role as string);
      if (userRole !== 'admin' && userRole !== 'owner') {
        res.status(403).json({ error: 'Unauthorized. Only admins and owners can generate sales reports.' });
        return;
      }

      const reportType = (req.query.type as 'summary' | 'category' | 'daily') || 'summary';

      const stats = await reportRepository.getStats();
      const patterns = await reportRepository.getPOSPatterns();
      const popularProducts = await reportRepository.getPopularProducts();

      let allProducts: any[] = [];
      if (reportType === 'category') {
        allProducts = await ProductModel.find().sort({ category: 1, salesCount: -1 }).lean();
      }

      const pdfBuffer = await generateSalesReportPDF(stats, patterns, popularProducts, reportType, allProducts);

      // Ensure reports directory exists on server disk
      const reportsDir = path.join(process.cwd(), 'reports');
      if (!fs.existsSync(reportsDir)) {
        fs.mkdirSync(reportsDir, { recursive: true });
      }

      // Save report PDF physically on disk
      const reportId = `rep_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
      const filename = `${reportType}_sales_report_${new Date().toISOString().split('T')[0]}_${reportId}.pdf`;
      const filePath = path.join(reportsDir, filename);
      fs.writeFileSync(filePath, pdfBuffer);

      // Save metadata entry in MongoDB
      await SavedReportModel.create({
        _id: reportId,
        reportType,
        filename,
        filePath: `/reports/${filename}`,
        generatedBy: userRole,
        createdAt: new Date().toISOString(),
      });

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
      res.send(pdfBuffer);
    } catch (err: any) {
      console.error('[reports] generate PDF error:', err);
      res.status(500).json({ error: err.message || 'Failed to generate sales report PDF' });
    }
  };

  listSavedReports = async (req: Request, res: Response) => {
    try {
      const userRole = req.headers['x-user-role'] as string;
      if (userRole !== 'admin' && userRole !== 'owner') {
        res.status(403).json({ error: 'Unauthorized. Only admins and owners can view reports.' });
        return;
      }

      const reports = await SavedReportModel.find({}).sort({ createdAt: -1 }).lean();
      const reportsWithLocalPath = reports.map((r: any) => ({
        ...r,
        localPath: path.join(process.cwd(), 'reports', r.filename)
      }));

      res.json(reportsWithLocalPath);
    } catch (err) {
      console.error('[reports] list saved reports error:', err);
      res.status(500).json({ error: 'Failed to list saved reports' });
    }
  };

  deleteSavedReport = async (req: Request, res: Response) => {
    try {
      const userRole = req.headers['x-user-role'] as string;
      if (userRole !== 'admin' && userRole !== 'owner') {
        res.status(403).json({ error: 'Unauthorized. Only admins and owners can manage reports.' });
        return;
      }

      const reportId = req.params.id as string;
      const report = await SavedReportModel.findById(reportId).lean();

      if (!report) {
        res.status(404).json({ error: 'Saved report not found' });
        return;
      }

      // Delete file from disk if it exists
      const fullPath = path.join(process.cwd(), 'reports', report.filename);
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
      }

      // Delete Mongoose entry
      await SavedReportModel.deleteOne({ _id: reportId });

      res.json({ message: 'Saved report deleted successfully' });
    } catch (err) {
      console.error('[reports] delete saved report error:', err);
      res.status(500).json({ error: 'Failed to delete saved report' });
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

  listBackups = async (req: Request, res: Response) => {
    try {
      const dir = getBackupsDir();
      const files = fs.readdirSync(dir).filter(f => f.endsWith('.json'));
      const list = files.map(file => {
        const filePath = path.join(dir, file);
        const stats = fs.statSync(filePath);
        return {
          filename: file,
          size: stats.size,
          createdAt: stats.birthtime || stats.mtime
        };
      }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      res.json(list);
    } catch (err) {
      console.error('[reports] list backups error:', err);
      res.status(500).json({ error: 'Failed to list database backups' });
    }
  };

  createBackup = async (req: Request, res: Response) => {
    try {
      const users = await UserModel.find({});
      const products = await ProductModel.find({});
      const customers = await CustomerModel.find({});
      const transactions = await TransactionModel.find({});
      const graphNodes = await GraphNodeModel.find({});
      const graphEdges = await GraphEdgeModel.find({});

      const backupObj = {
        version: 1,
        timestamp: new Date().toISOString(),
        data: {
          users,
          products,
          customers,
          transactions,
          graphNodes,
          graphEdges
        }
      };

      const dir = getBackupsDir();
      const dateStr = new Date().toISOString().replace(/:/g, '-').split('.')[0];
      const filename = `backup_${dateStr}.json`;
      const filePath = path.join(dir, filename);

      fs.writeFileSync(filePath, JSON.stringify(backupObj, null, 2), 'utf-8');

      res.json({ message: 'Backup created successfully', filename });
    } catch (err) {
      console.error('[reports] create backup error:', err);
      res.status(500).json({ error: 'Failed to create database backup' });
    }
  };

  restoreBackup = async (req: Request, res: Response) => {
    try {
      const filename = req.params.filename as string;
      const dir = getBackupsDir();
      const filePath = path.join(dir, filename);

      if (!fs.existsSync(filePath)) {
        res.status(404).json({ error: 'Backup file not found' });
        return;
      }

      const content = fs.readFileSync(filePath, 'utf-8');
      const backup = JSON.parse(content);

      await this.restoreBackupData(backup);

      res.json({ message: 'Database successfully restored from backup file' });
    } catch (err: any) {
      console.error('[reports] restore backup error:', err);
      res.status(500).json({ error: err.message || 'Failed to restore database from backup' });
    }
  };

  downloadBackup = async (req: Request, res: Response) => {
    try {
      const filename = req.params.filename as string;
      const dir = getBackupsDir();
      const filePath = path.join(dir, filename);

      if (!fs.existsSync(filePath)) {
        res.status(404).json({ error: 'Backup file not found' });
        return;
      }

      res.download(filePath, filename);
    } catch (err) {
      console.error('[reports] download backup error:', err);
      res.status(500).json({ error: 'Failed to download backup file' });
    }
  };

  deleteBackup = async (req: Request, res: Response) => {
    try {
      const filename = req.params.filename as string;
      const dir = getBackupsDir();
      const filePath = path.join(dir, filename);

      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      res.json({ message: 'Backup file deleted successfully' });
    } catch (err) {
      console.error('[reports] delete backup error:', err);
      res.status(500).json({ error: 'Failed to delete backup file' });
    }
  };

  uploadBackup = async (req: Request, res: Response) => {
    try {
      const { backupData } = req.body;
      if (!backupData || !backupData.data) {
        res.status(400).json({ error: 'Invalid backup data format' });
        return;
      }

      await this.restoreBackupData(backupData);

      res.json({ message: 'Database successfully restored from uploaded backup file' });
    } catch (err: any) {
      console.error('[reports] upload backup error:', err);
      res.status(500).json({ error: err.message || 'Failed to restore database from uploaded backup' });
    }
  };

  private restoreBackupData = async (backup: any) => {
    const { users, products, customers, transactions, graphNodes, graphEdges } = backup.data;

    // Clear Mongoose collections
    await UserModel.deleteMany({});
    await ProductModel.deleteMany({});
    await TransactionModel.deleteMany({});
    await CustomerModel.deleteMany({});
    await GraphNodeModel.deleteMany({});
    await GraphEdgeModel.deleteMany({});

    // Restore data
    if (users && users.length > 0) await UserModel.insertMany(users);
    if (products && products.length > 0) await ProductModel.insertMany(products);
    if (customers && customers.length > 0) await CustomerModel.insertMany(customers);
    if (transactions && transactions.length > 0) await TransactionModel.insertMany(transactions);
    if (graphNodes && graphNodes.length > 0) await GraphNodeModel.insertMany(graphNodes);
    if (graphEdges && graphEdges.length > 0) await GraphEdgeModel.insertMany(graphEdges);

    // Reload in-memory structures
    await store.loadAll();
  };
}

export const reportController = new ReportController();
export default reportController;
