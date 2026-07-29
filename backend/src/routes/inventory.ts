import { Router } from 'express';
import inventoryController from '../controllers/inventoryController.js';
const router = Router();
router.get('/presets', inventoryController.getPresets);
router.post('/presets', inventoryController.createPreset);
router.put('/presets/:id', inventoryController.updatePreset);
router.post('/presets/:id/apply', inventoryController.applyPreset);
router.delete('/presets/:id', inventoryController.deletePreset);
export default router;
