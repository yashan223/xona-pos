import { Router } from 'express';
import inventoryController from '../controllers/inventoryController.js';

const router = Router();

// GET /api/inventory/presets — List all saved stock presets
router.get('/presets', inventoryController.getPresets);

// POST /api/inventory/presets — Create a new stock preset
router.post('/presets', inventoryController.createPreset);

// POST /api/inventory/presets/:id/apply — Apply a stock preset to update products
router.post('/presets/:id/apply', inventoryController.applyPreset);

// DELETE /api/inventory/presets/:id — Delete a stock preset
router.delete('/presets/:id', inventoryController.deletePreset);

export default router;
