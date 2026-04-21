import {
  createPrescription,
  getPrescriptionById,
  listPrescriptions,
  updatePrescriptionStatus,
} from '../services/prescription.service.js'
import { generatePrescriptionPdf } from '../services/pdf.service.js'
import { sendError, sendSuccess } from '../utils/responseHandler.js'

export const getAllPrescriptions = async (req, res) => {
  try {
    const { prescriptions, pagination } = await listPrescriptions(req.user, req.query || {})
    return sendSuccess(res, { prescriptions, pagination }, 'Prescriptions loaded')
  } catch (error) {
    return sendError(res, error.message || 'Failed to load prescriptions', error.statusCode || 500)
  }
}

export const getPrescription = async (req, res) => {
  try {
    const prescription = await getPrescriptionById(req.params.id, req.user)
    return sendSuccess(res, { prescription }, 'Prescription loaded')
  } catch (error) {
    return sendError(res, error.message || 'Failed to load prescription', error.statusCode || 500)
  }
}

export const createNewPrescription = async (req, res) => {
  try {
    const { patientId, patient, items } = req.body || {}

    if ((!patientId && !patient) || !Array.isArray(items) || items.length === 0) {
      return sendError(res, 'patient or patientId and at least one item are required', 400)
    }

    const result = await createPrescription({
      ...(req.body || {}),
      doctorId: req.user.id || req.user._id,
    })

    return sendSuccess(res, result, 'Prescription created', 201)
  } catch (error) {
    return sendError(res, error.message || 'Failed to create prescription', error.statusCode || 500)
  }
}

export const updateExistingPrescriptionStatus = async (req, res) => {
  try {
    const { status } = req.body || {}

    if (!status) {
      return sendError(res, 'status is required', 400)
    }

    const prescription = await updatePrescriptionStatus(req.params.id, status)
    return sendSuccess(res, { prescription }, 'Prescription status updated')
  } catch (error) {
    return sendError(
      res,
      error.message || 'Failed to update prescription status',
      error.statusCode || 500
    )
  }
}

export const downloadPrescriptionPdf = async (req, res) => {
  try {
    const pdfBuffer = await generatePrescriptionPdf(req.params.id, req.user)

    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `attachment; filename="prescription-${req.params.id}.pdf"`)
    res.send(pdfBuffer)

    return undefined
  } catch (error) {
    return sendError(res, error.message || 'Failed to generate prescription PDF', error.statusCode || 500)
  }
}
