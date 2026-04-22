import { Router } from 'express'
import {
  createNewPrescription,
  downloadPrescriptionPdf,
  getAllPrescriptions,
  getPrescription,
  updateDraft,
  updateExistingPrescriptionStatus,
} from '../controllers/prescription.controller.js'
import { verifyToken } from '../middlewares/auth.middleware.js'
import { requireRole } from '../middlewares/role.middleware.js'
import {
  validateCreatePrescription,
  validatePrescriptionIdParam,
  validatePrescriptionQuery,
  validateUpdatePrescriptionStatus,
} from '../validators/prescription.validator.js'

const router = Router()

router.use(verifyToken)

router.get('/', requireRole('DOCTOR', 'PHARMACIST', 'PATIENT'), validatePrescriptionQuery, getAllPrescriptions)
router.post('/', requireRole('DOCTOR'), validateCreatePrescription, createNewPrescription)
router.get('/:id/pdf', requireRole('DOCTOR', 'PHARMACIST', 'PATIENT'), validatePrescriptionIdParam, downloadPrescriptionPdf)
router.get('/:id', requireRole('DOCTOR', 'PHARMACIST', 'PATIENT'), validatePrescriptionIdParam, getPrescription)
router.patch('/:id', requireRole('DOCTOR'), validatePrescriptionIdParam, updateDraft)
router.put('/:id/status', requireRole('PHARMACIST'), validateUpdatePrescriptionStatus, updateExistingPrescriptionStatus)

export default router
