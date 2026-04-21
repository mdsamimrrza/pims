import mongoose from 'mongoose'
import Patient from '../models/Patient.model.js'
import Prescription from '../models/Prescription.model.js'
import Medicine from '../models/Medicine.model.js'
import User from '../models/User.model.js'
import { createPatient, createPatientPortalAccount } from './patient.service.js'
import { consumeInventoryForPrescriptionItems } from './inventory.service.js'
import { sendPrescriptionNotificationEmail } from './email.service.js'
import { ROLES } from '../utils/constants.js'
import { buildPagination, getPagination } from '../utils/pagination.js'
import { generatePassword } from '../utils/password.js'

const PRESCRIPTION_STATUSES = ['Pending', 'Processing', 'Filled', 'Cancelled']
const PHARMACIST_ALLOWED_STATUSES = ['Processing', 'Filled', 'Cancelled']

const prescriptionNotFound = () => {
  const error = new Error('Prescription not found')
  error.statusCode = 404
  return error
}

const validationError = (message) => {
  const error = new Error(message)
  error.statusCode = 400
  return error
}

const forbiddenError = (message) => {
  const error = new Error(message)
  error.statusCode = 403
  return error
}

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const ensureObjectId = (value, label) => {
  if (!mongoose.isValidObjectId(value)) {
    throw validationError(`Invalid ${label}`)
  }
}

const generateRxId = async () => {
  const total = await Prescription.countDocuments()
  return `RX-${String(total + 9001).padStart(4, '0')}`
}

const buildDigitalSignature = (doctor) => {
  const nameSeed = String(doctor?.lastName || doctor?.firstName || 'PIMS')
    .replace(/[^A-Za-z0-9]/g, '')
    .toUpperCase()
    .slice(0, 6) || 'PIMS'

  return `DSIG-${nameSeed}-${Date.now().toString().slice(-4)}`
}

const normalizeAtcCode = (value) => String(value || '').trim().toUpperCase()

const normalizePrescriptionItems = async (items) => {
  if (!Array.isArray(items) || items.length === 0) {
    throw validationError('At least one prescription item is required')
  }

  const normalizedItems = []

  for (const item of items) {
    if (!item?.dose || !item?.frequency) {
      throw validationError('Each prescription item requires dose and frequency')
    }

    let medicine = null

    if (item.medicineId) {
      ensureObjectId(item.medicineId, 'medicineId')
      medicine = await Medicine.findById(item.medicineId)

      if (!medicine) {
        throw validationError('Referenced medicine not found')
      }
    }

    const atcCode = normalizeAtcCode(item.atcCode || medicine?.atcCode)

    if (!atcCode) {
      throw validationError('Each prescription item requires an atcCode or valid medicineId')
    }

    normalizedItems.push({
      medicineId: medicine?._id || null,
      atcCode,
      dose: String(item.dose).trim(),
      quantity: Number(item.quantity) > 0 ? Number(item.quantity) : 1,
      frequency: String(item.frequency).trim(),
      route: String(item.route || 'Oral').trim(),
      durationDays: Number(item.durationDays) > 0 ? Number(item.durationDays) : 1,
      instructions: String(item.instructions || '').trim(),
    })
  }

  return normalizedItems
}

const getPatientIdForActor = async (actor) => {
  const userId = actor?.id || actor?._id

  if (!userId) {
    throw forbiddenError('Patient account is not linked to a patient record')
  }

  const patient = await Patient.findOne({ userId })

  if (!patient) {
    throw forbiddenError('Patient account is not linked to a patient record')
  }

  return patient._id
}

const getPrescriptionQuery = async (actor, filters = {}) => {
  const query = {}

  if (actor?.role === ROLES.DOCTOR) {
    query.doctorId = actor.id || actor._id
  } else if (actor?.role === ROLES.PATIENT) {
    query.patientId = await getPatientIdForActor(actor)
  } else if (filters.doctorId) {
    query.doctorId = filters.doctorId
  }

  if (filters.status && PRESCRIPTION_STATUSES.includes(filters.status)) {
    query.status = filters.status
  }

  if (filters.patientId) {
    query.patientId = filters.patientId
  }

  if (filters.isUrgent === 'true') {
    query.isUrgent = true
  }

  if (filters.isUrgent === 'false') {
    query.isUrgent = false
  }

  if (filters.q) {
    query.rxId = { $regex: escapeRegex(String(filters.q).trim()), $options: 'i' }
  }

  return query
}

const populatePrescriptionQuery = (query) =>
  query
    .populate('patientId', 'patientId name dob gender allergies medicalHistory weight userId')
    .populate('patientId.userId', 'firstName lastName email role lastLogin')
    .populate('doctorId', 'firstName lastName email role')
    .populate('items.medicineId', 'name genericName brand atcCode strength dosageForm')

export const listPrescriptions = async (actor, filters = {}) => {
  const query = await getPrescriptionQuery(actor, filters)
  const { page, limit, skip } = getPagination(filters)

  const [prescriptions, total] = await Promise.all([
    populatePrescriptionQuery(Prescription.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit)),
    Prescription.countDocuments(query),
  ])

  return {
    prescriptions,
    pagination: buildPagination({ page, limit, total }),
  }
}

export const getPrescriptionById = async (id, actor) => {
  ensureObjectId(id, 'prescription id')

  const query = { _id: id }

  if (actor?.role === ROLES.DOCTOR) {
    query.doctorId = actor.id || actor._id
  } else if (actor?.role === ROLES.PATIENT) {
    query.patientId = await getPatientIdForActor(actor)
  }

  const prescription = await populatePrescriptionQuery(Prescription.findOne(query))

  if (!prescription) {
    throw prescriptionNotFound()
  }

  return prescription
}

export const createPrescription = async (payload) => {
  ensureObjectId(payload.doctorId, 'doctorId')

  const normalizedItems = await normalizePrescriptionItems(payload.items)
  let patient = null
  let patientPortal = null

  if (payload.patientId) {
    ensureObjectId(payload.patientId, 'patientId')
    patient = await Patient.findById(payload.patientId)

    const existingPatientEmail = String(payload.patientEmail || payload.patient?.email || '').trim().toLowerCase()

    if (patient && !patient.userId && existingPatientEmail) {
      patientPortal = await createPatientPortalAccount(patient._id, {
        firstName: payload.patient?.firstName,
        lastName: payload.patient?.lastName,
        email: existingPatientEmail,
        password: payload.patient?.password || generatePassword(),
      })
    }
  } else {
    const sourcePatient = payload.patient || {}
    if (!String(sourcePatient.name || '').trim() || !String(sourcePatient.dob || '').trim() || !String(sourcePatient.email || '').trim()) {
      throw validationError('New patient name, dob, and email are required')
    }

    const normalizedEmail = String(sourcePatient.email || '').trim().toLowerCase()
    const existingPortalUser = await User.findOne({ email: normalizedEmail })

    if (existingPortalUser) {
      if (existingPortalUser.role !== ROLES.PATIENT) {
        throw validationError('Email already exists for a non-patient account')
      }

      const linkedPatient = await Patient.findOne({ userId: existingPortalUser._id })

      if (!linkedPatient) {
        throw validationError('Patient account exists but is not linked to a patient record')
      }

      patient = linkedPatient
      patientPortal = {
        patient: linkedPatient,
        user: existingPortalUser,
        access: {
          email: existingPortalUser.email,
          password: null,
          loginUrl: String(process.env.CLIENT_URL || '').replace(/\/+$/, '')
            ? `${String(process.env.CLIENT_URL || '').replace(/\/+$/, '')}/patient/access`
            : '/patient/access',
        },
      }
    } else {
      patient = await createPatient({
        patientId: sourcePatient.patientId,
        name: sourcePatient.name,
        dob: sourcePatient.dob,
        gender: sourcePatient.gender,
        allergies: sourcePatient.allergies,
        medicalHistory: sourcePatient.medicalHistory,
      })

      patientPortal = await createPatientPortalAccount(patient._id, {
        firstName: sourcePatient.firstName,
        lastName: sourcePatient.lastName,
        email: normalizedEmail,
        password: sourcePatient.password || generatePassword(),
      })
    }
  }

  const doctor = await User.findById(payload.doctorId)

  if (!patient) {
    throw validationError('Patient not found')
  }

  if (!doctor || !doctor.isActive || doctor.role !== ROLES.DOCTOR) {
    throw validationError('Doctor not found')
  }

  const prescription = await Prescription.create({
    rxId: await generateRxId(),
    patientId: patient._id,
    doctorId: doctor._id,
    diagnosis: String(payload.diagnosis || '').trim(),
    items: normalizedItems,
    status: 'Pending',
    isUrgent: Boolean(payload.isUrgent),
    allowRefills:
      Number(payload.allowRefills) >= 0 && Number(payload.allowRefills) <= 3
        ? Number(payload.allowRefills)
        : 0,
    digitalSignature: String(payload.digitalSignature || buildDigitalSignature(doctor)).trim(),
    pdfUrl: String(payload.pdfUrl || '').trim(),
  })

  if (process.env.PHARMACY_NOTIFICATION_EMAIL) {
    try {
      await sendPrescriptionNotificationEmail({
        to: process.env.PHARMACY_NOTIFICATION_EMAIL,
        rxId: prescription.rxId,
        patientName: patient.name,
        doctorName: `${doctor.firstName} ${doctor.lastName}`.trim(),
        isUrgent: prescription.isUrgent,
      })
    } catch (error) {
      console.warn(`Failed to write prescription notification email for ${prescription.rxId}: ${error.message}`)
    }
  }

  const responsePrescription = await getPrescriptionById(prescription._id, { role: ROLES.PHARMACIST })

  return {
    prescription: responsePrescription,
    patientPortal: patientPortal
      ? {
          patient: patientPortal.patient,
          user: patientPortal.user,
          access: patientPortal.access,
        }
      : null,
  }
}

export const updatePrescriptionStatus = async (id, status) => {
  ensureObjectId(id, 'prescription id')

  if (!PHARMACIST_ALLOWED_STATUSES.includes(status)) {
    throw validationError(
      `Invalid prescription status. Allowed values: ${PHARMACIST_ALLOWED_STATUSES.join(', ')}`
    )
  }

  const existingPrescription = await Prescription.findById(id).lean()

  if (!existingPrescription) {
    throw prescriptionNotFound()
  }

  if (existingPrescription.status === status) {
    return getPrescriptionById(id, { role: ROLES.PHARMACIST })
  }

  const prescription = await Prescription.findByIdAndUpdate(
    id,
    { status },
    { new: true, runValidators: true }
  )

  if (!prescription) {
    throw prescriptionNotFound()
  }

  if (status === 'Filled' && existingPrescription.status !== 'Filled') {
    try {
      await consumeInventoryForPrescriptionItems(existingPrescription.items)
    } catch (error) {
      await Prescription.findByIdAndUpdate(
        id,
        { status: existingPrescription.status },
        { new: true, runValidators: true }
      )
      throw error
    }
  }

  return getPrescriptionById(prescription._id, { role: ROLES.PHARMACIST })
}
