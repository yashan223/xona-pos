import { Request, Response } from 'express';
import { ProductModel, StockPresetModel } from '../persistence/database.js';
import { logActivity } from '../lib/logger.js';

class InventoryController {
  
  // ─── Stock Presets ─────────────────────────────────────────

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
      const userName = req.headers['x-user-id'] as string; // Usually we have x-user-id, but we'll use role or ID

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
      // You could extract the actual user name if passed, we'll use userRole for now
      // Let's also check if they sent a specific name in the body just in case
      const updatedBy = req.body.updatedBy || userRole;

      const preset = await StockPresetModel.findById(id).lean();
      if (!preset) {
        res.status(404).json({ error: 'Preset not found' });
        return;
      }

      const timestamp = new Date().toISOString();

      // Update each item in the preset
      for (const item of preset.items) {
        await ProductModel.findByIdAndUpdate(item.productId, {
          stock: item.qty,
          lastStockUpdatedBy: updatedBy,
          lastStockUpdatedAt: timestamp,
          updatedAt: timestamp
        });
      }

      await logActivity(req, 'APPLY_PRESET', 'StockPreset', id, { updatedProductsCount: preset.items.length, presetName: preset.name });
      res.json({ message: 'Preset applied successfully' });
    } catch (err) {
      console.error('[inventory] Error applying preset:', err);
      res.status(500).json({ error: 'Failed to apply preset' });
    }
  };

}

export default new InventoryController();
