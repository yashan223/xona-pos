import { Request } from 'express';
import { ActivityLogModel } from '../models/index.js';
export async function logActivity(
  req: Request,
  action: string,
  entity: string,
  entityId?: string,
  details?: any
) {
  try {
    const userId = req.headers['x-user-id'] as string || 'system';
    await ActivityLogModel.create({
      action,
      entity,
      entityId,
      userId,
      details
    });
  } catch (error) {
    console.error('Failed to log activity:', error);
  }
}
