import { Request, Response } from 'express';
import reportRepository from '../repositories/reportRepository.js';
import { UserModel, ProductModel, CustomerModel, TransactionModel, GraphNodeModel, GraphEdgeModel, SavedReportModel } from '../persistence/database.js';
import db from '../persistence/sqliteDb.js';
import { isCloudOnline } from '../persistence/syncEngine.js';
import { broadcast } from '../lib/websocket.js';
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
      const backendDir = process.cwd().endsWith('backend') ? process.cwd() : path.join(process.cwd(), 'backend');
      const reportsDir = path.join(backendDir, 'reports');
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
      const backendDir = process.cwd().endsWith('backend') ? process.cwd() : path.join(process.cwd(), 'backend');
      const reportsWithLocalPath = reports.map((r: any) => ({
        ...r,
        localPath: path.join(backendDir, 'reports', r.filename)
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
      const backendDir = process.cwd().endsWith('backend') ? process.cwd() : path.join(process.cwd(), 'backend');
      const fullPath = path.join(backendDir, 'reports', report.filename);
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
      const adminUsername = process.env.ADMIN_USERNAME || 'admin';
      await UserModel.deleteMany({ username: { $ne: adminUsername } });
      await ProductModel.deleteMany({});
      await TransactionModel.deleteMany({});
      await CustomerModel.deleteMany({});
      await GraphNodeModel.deleteMany({});
      await GraphEdgeModel.deleteMany({});

      res.json({ message: 'Database cleared successfully (admin user retained)' });
    } catch (err) {
      console.error('[reports] clear database error:', err);
      res.status(500).json({ error: 'Failed to clear database' });
    }
  };

  resetDatabase = async (req: Request, res: Response) => {
    try {
      // 1. Clear database
      const adminUsername = process.env.ADMIN_USERNAME || 'admin';
      await UserModel.deleteMany({ username: { $ne: adminUsername } });
      await ProductModel.deleteMany({});
      await TransactionModel.deleteMany({});
      await CustomerModel.deleteMany({});
      await GraphNodeModel.deleteMany({});
      await GraphEdgeModel.deleteMany({});

      res.json({ message: 'Database reset successfully' });
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
      const online = isCloudOnline();

      // Read from local SQLite
      const localProds = db.prepare('SELECT * FROM local_products').all() as any[];
      const localCusts = db.prepare('SELECT * FROM local_customers').all() as any[];
      const localTxs = db.prepare('SELECT * FROM local_transactions').all() as any[];
      const localNodes = db.prepare('SELECT * FROM local_graph_nodes').all() as any[];
      const localEdges = db.prepare('SELECT * FROM local_graph_edges').all() as any[];
      const localUsers = db.prepare('SELECT * FROM local_users').all() as any[];

      let users = localUsers;
      let products = localProds.map(p => ({
        _id: p.id,
        name: p.name,
        sku: p.sku,
        category: p.category,
        price: p.price,
        cost: p.cost,
        stock: p.stock,
        description: p.description,
        imageUrl: p.imageUrl,
        salesCount: p.salesCount,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
      }));
      let customers = localCusts.map(c => ({
        _id: c.id,
        name: c.name,
        phone: c.phone,
        email: c.email,
        createdAt: c.createdAt,
      }));
      let transactions = localTxs.map(t => ({
        _id: t.id,
        cashierId: t.cashierId,
        customerId: t.customerId,
        items: JSON.parse(t.itemsJson || '[]'),
        subtotal: t.subtotal,
        discount: t.discount,
        tax: t.tax,
        totalAmount: t.totalAmount,
        paymentMethod: t.paymentMethod,
        paymentStatus: t.paymentStatus,
        createdAt: t.createdAt,
      }));
      let graphNodes = localNodes.map(n => ({
        _id: n.id,
        type: n.type,
        label: n.label,
        metadata: n.metadataJson ? JSON.parse(n.metadataJson) : {},
      }));
      let graphEdges = localEdges.map(e => ({
        _id: e.id,
        source: e.source,
        target: e.target,
        type: e.type,
        metadata: e.metadataJson ? JSON.parse(e.metadataJson) : {},
      }));

      // Fallback/enrich with Cloud MongoDB if online and SQLite is empty
      if (online && products.length === 0) {
        users = await UserModel.find({}).lean() as any[];
        products = await ProductModel.find({}).lean() as any[];
        customers = await CustomerModel.find({}).lean() as any[];
        transactions = await TransactionModel.find({}).lean() as any[];
        graphNodes = await GraphNodeModel.find({}).lean() as any[];
        graphEdges = await GraphEdgeModel.find({}).lean() as any[];
      }

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
      let backupData = req.body.backupData;
      if (typeof backupData === 'string') {
        try {
          backupData = JSON.parse(backupData);
        } catch (e) {
          // ignore
        }
      }

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
    const online = isCloudOnline();

    // 1. Clear local SQLite tables
    db.prepare('DELETE FROM local_products').run();
    db.prepare('DELETE FROM local_customers').run();
    db.prepare('DELETE FROM local_transactions').run();
    db.prepare('DELETE FROM local_graph_nodes').run();
    db.prepare('DELETE FROM local_graph_edges').run();

    // 2. Clear Cloud MongoDB collections if online
    if (online) {
      try {
        await ProductModel.deleteMany({});
        await TransactionModel.deleteMany({});
        await CustomerModel.deleteMany({});
        await GraphNodeModel.deleteMany({});
        await GraphEdgeModel.deleteMany({});
      } catch (err) {
        console.error('[reports] Failed to clear Cloud MongoDB during restore:', err);
      }
    }

    // 3. Restore Products into SQLite and Cloud MongoDB
    if (products && products.length > 0) {
      const insertProd = db.prepare(`
        INSERT INTO local_products (id, name, sku, category, price, cost, stock, description, imageUrl, salesCount, synced, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
      `);
      for (const p of products) {
        const id = p._id || p.id;
        insertProd.run(
          id,
          p.name,
          p.sku,
          p.category,
          p.price,
          p.cost || 0,
          p.stock || 0,
          p.description || '',
          p.imageUrl || '',
          p.salesCount || 0,
          p.createdAt || new Date().toISOString(),
          p.updatedAt || new Date().toISOString()
        );
      }

      if (online) {
        try {
          await ProductModel.insertMany(products.map((p: any) => ({ ...p, _id: p._id || p.id })));
        } catch (err) {
          console.error('[reports] Cloud MongoDB product restore error:', err);
        }
      }
    }

    // 4. Restore Customers into SQLite and Cloud MongoDB
    if (customers && customers.length > 0) {
      const insertCust = db.prepare(`
        INSERT INTO local_customers (id, name, phone, email, synced, createdAt)
        VALUES (?, ?, ?, ?, 1, ?)
      `);
      for (const c of customers) {
        const id = c._id || c.id;
        insertCust.run(id, c.name, c.phone || '', c.email || '', c.createdAt || new Date().toISOString());
      }

      if (online) {
        try {
          await CustomerModel.insertMany(customers.map((c: any) => ({ ...c, _id: c._id || c.id })));
        } catch (err) {
          console.error('[reports] Cloud MongoDB customer restore error:', err);
        }
      }
    }

    // 5. Restore Transactions into SQLite and Cloud MongoDB
    if (transactions && transactions.length > 0) {
      const insertTx = db.prepare(`
        INSERT INTO local_transactions (id, cashierId, customerId, itemsJson, subtotal, discount, tax, totalAmount, paymentMethod, paymentStatus, synced, createdAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
      `);
      for (const t of transactions) {
        const id = t._id || t.id;
        insertTx.run(
          id,
          t.cashierId,
          t.customerId || null,
          JSON.stringify(t.items || []),
          t.subtotal,
          t.discount || 0,
          t.tax || 0,
          t.totalAmount,
          t.paymentMethod || 'cash',
          t.paymentStatus || 'paid',
          t.createdAt || new Date().toISOString()
        );
      }

      if (online) {
        try {
          await TransactionModel.insertMany(transactions.map((t: any) => ({ ...t, _id: t._id || t.id })));
        } catch (err) {
          console.error('[reports] Cloud MongoDB transaction restore error:', err);
        }
      }
    }

    // 6. Restore Graph Nodes & Edges into SQLite and Cloud MongoDB
    if (graphNodes && graphNodes.length > 0) {
      const insertNode = db.prepare(`
        INSERT INTO local_graph_nodes (id, type, label, metadataJson, synced)
        VALUES (?, ?, ?, ?, 1)
      `);
      for (const n of graphNodes) {
        const id = n._id || n.id;
        insertNode.run(id, n.type, n.label, JSON.stringify(n.metadata || {}));
      }

      if (online) {
        try {
          await GraphNodeModel.insertMany(graphNodes.map((n: any) => ({ ...n, _id: n._id || n.id })));
        } catch (err) {
          console.error('[reports] Cloud MongoDB node restore error:', err);
        }
      }
    }

    if (graphEdges && graphEdges.length > 0) {
      const insertEdge = db.prepare(`
        INSERT INTO local_graph_edges (id, source, target, type, metadataJson, synced)
        VALUES (?, ?, ?, ?, ?, 1)
      `);
      for (const e of graphEdges) {
        const id = e._id || e.id || `edge:${e.source}:${e.target}:${e.type}`;
        insertEdge.run(id, e.source, e.target, e.type, JSON.stringify(e.metadata || {}));
      }

      if (online) {
        try {
          await GraphEdgeModel.insertMany(graphEdges.map((e: any) => ({ ...e, _id: e._id || e.id })));
        } catch (err) {
          console.error('[reports] Cloud MongoDB edge restore error:', err);
        }
      }
    }

    // Broadcast WebSocket updates
    broadcast('PRODUCTS_UPDATED');
    broadcast('TRANSACTIONS_UPDATED');
  };
}

export const reportController = new ReportController();
export default reportController;
