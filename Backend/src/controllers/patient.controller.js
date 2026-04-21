import {
  createPatient,
  createPatientPortalAccount,
  getPatientById,
  getPatientByUserId,
  listPatients,
} from '../services/patient.service.js'
import { sendError, sendSuccess } from '../utils/responseHandler.js'

export const getAllPatients = async (req, res) => {
  try {
    const { patients, pagination } = await listPatients(req.query || {})
    return sendSuccess(res, { patients, pagination }, 'Patients loaded')
  } catch (error) {
    return sendError(res, error.message || 'Failed to load patients', error.statusCode || 500)
  }
}

export const getSinglePatient = async (req, res) => {
  try {
    const patient = await getPatientById(req.params.id)
    return sendSuccess(res, { patient }, 'Patient loaded')
  } catch (error) {
    return sendError(res, error.message || 'Failed to load patient', error.statusCode || 500)
  }
}

export const getMyPatientRecord = async (req, res) => {
  try {
    const patient = await getPatientByUserId(req.user.id || req.user._id)
    return sendSuccess(res, { patient }, 'Patient loaded')
  } catch (error) {
    return sendError(res, error.message || 'Failed to load patient', error.statusCode || 500)
  }
}

export const createNewPatient = async (req, res) => {
  try {
    const { name, dob } = req.body || {}

    if (!name || !dob) {
      return sendError(res, 'name and dob are required', 400)
    }

    const patient = await createPatient(req.body || {})
    return sendSuccess(res, { patient }, 'Patient created', 201)
  } catch (error) {
    return sendError(res, error.message || 'Failed to create patient', error.statusCode || 500)
  }
}

export const createPatientPortalUser = async (req, res) => {
  try {
    const result = await createPatientPortalAccount(req.params.id, req.body || {})
    return sendSuccess(res, result, 'Patient portal account created', 201)
  } catch (error) {
    return sendError(res, error.message || 'Failed to create patient portal account', error.statusCode || 500)
  }
}
