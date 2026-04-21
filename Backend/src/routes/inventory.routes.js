import { Router } from 'express'
import {
  createNewInventoryItem,
  deleteExistingInventoryItem,
  getAllInventory,
  getInventoryAuditReport,
  updateExistingInventoryItem,
} from '../controllers/inventory.controller.js'
import { verifyToken } from '../middlewares/auth.middleware.js'
import { requireRole } from '../middlewares/role.middleware.js'
import {
  validateCreateInventoryItem,
  validateInventoryIdParam,
  validateInventoryQuery,
  validateUpdateInventoryItem,
} from '../validators/inventory.validator.js'

const router = Router()

router.use(verifyToken)

router.get('/audit', requireRole('ADMIN'), validateInventoryQuery, getInventoryAuditReport)
router.get('/', requireRole('PHARMACIST'), validateInventoryQuery, getAllInventory)
router.post('/', requireRole('PHARMACIST'), validateCreateInventoryItem, createNewInventoryItem)
router.put('/:id', requireRole('PHARMACIST'), validateUpdateInventoryItem, updateExistingInventoryItem)
router.delete('/:id', requireRole('PHARMACIST'), validateInventoryIdParam, deleteExistingInventoryItem)

export default router
