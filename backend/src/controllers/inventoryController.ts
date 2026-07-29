import { Request, Response } from 'express';
import { ProductModel, StockPresetModel } from '../persistence/database.js';
import { logActivity } from '../lib/logger.js';
class InventoryController {
  getPresets = async (req: Request, res: Response) => {
    try {
      const presets = await StockPresetModel.find().sort({ createdAt: -1 }).lean();
      res.json(presets);
    } catch (err) {
      console.error('[inventory] Error fetching presets:', err);
      res.status(500).json({ error: 'Failed to fetch presets' });
    }
  };
  createPreset = async (req: Request, res: Response) => {
    try {
      const { name, items } = req.body;
      const userRole = req.headers['x-user-role'] as string;
      const userName = req.headers['x-user-id'] as string; 
      if (!name || !items || !Array.isArray(items)) {
        res.status(400).json({ error: 'Invalid preset data' });
        return;
      }
      const presetId = `preset_${Date.now()}`;
      const newPreset = {
        _id: presetId,
        name,
        items,
        createdBy: userRole === 'admin' || userRole === 'owner' ? userRole : 'user',
        createdAt: new Date().toISOString()
      };
      await StockPresetModel.create(newPreset);
      await logActivity(req, 'CREATE_PRESET', 'StockPreset', presetId, { name, itemsCount: items.length });
      res.json({ message: 'Preset created successfully', preset: newPreset });
    } catch (err) {
      console.error('[inventory] Error creating preset:', err);
      res.status(500).json({ error: 'Failed to create preset' });
    }
  };
  updatePreset = async (req: Request, res: Response) => {
    try {
      const id = req.params.id as string;
      const { name, items } = req.body;
      if (!name || !items || !Array.isArray(items)) {
        res.status(400).json({ error: 'Invalid preset data' });
        return;
      }
      const updated = await StockPresetModel.findByIdAndUpdate(
        id,
        { name, items, updatedAt: new Date().toISOString() },
        { new: true }
      );
      if (!updated) {
        res.status(404).json({ error: 'Preset not found' });
        return;
      }
      await logActivity(req, 'UPDATE_PRESET', 'StockPreset', id, { name, itemsCount: items.length });
      res.json({ message: 'Preset updated successfully', preset: updated });
    } catch (err) {
      console.error('[inventory] Error updating preset:', err);
      res.status(500).json({ error: 'Failed to update preset' });
    }
  };
  deletePreset = async (req: Request, res: Response) => {
    try {
      const id = req.params.id as string;
      await StockPresetModel.findByIdAndDelete(id);
      await logActivity(req, 'DELETE_PRESET', 'StockPreset', id);
      res.json({ message: 'Preset deleted successfully' });
    } catch (err) {
      console.error('[inventory] Error deleting preset:', err);
      res.status(500).json({ error: 'Failed to delete preset' });
    }
  };
  applyPreset = async (req: Request, res: Response) => {
    try {
      const id = req.params.id as string;
      const userRole = req.headers['x-user-role'] as string;
      const updatedBy = req.body.updatedBy || userRole;
      const preset = await StockPresetModel.findById(id).lean();
      if (!preset) {
        res.status(404).json({ error: 'Preset not found' });
        return;
      }
      const timestamp = new Date().toISOString();
      const updatedProductsLog: any[] = [];
      for (const item of preset.items) {
        const prod = await ProductModel.findById(item.productId);
        if (prod) {
          const prevStock = prod.stock;
          const newStock = prod.stock >= 0 ? prod.stock + item.qty : item.qty;
          await ProductModel.findByIdAndUpdate(item.productId, {
            stock: newStock,
            lastStockUpdatedBy: updatedBy,
            lastStockUpdatedAt: timestamp,
            updatedAt: timestamp
          });
          updatedProductsLog.push({
            name: prod.name,
            addedQty: item.qty,
            previousStock: prevStock,
            newStock
          });
        }
      }
      await logActivity(req, 'APPLY_PRESET', 'StockPreset', id, {
        presetName: preset.name,
        updatedProductsCount: updatedProductsLog.length,
        updatedBy,
        items: updatedProductsLog
      });
      res.json({ message: 'Preset applied successfully' });
    } catch (err) {
      console.error('[inventory] Error applying preset:', err);
      res.status(500).json({ error: 'Failed to apply preset' });
    }
  };
}
export default new InventoryController();
