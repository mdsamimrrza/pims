import crypto from 'crypto'
import Patient from '../models/Patient.model.js'
import { createUser } from './user.service.js'
import { buildPagination, getPagination } from '../utils/pagination.js'
import { generatePassword } from '../utils/password.js'

const patientNotFound = () => {
  const error = new Error('Patient not found')
  error.statusCode = 404
  return error
}

const duplicatePatientError = () => {
  const error = new Error('Patient ID already exists')
  error.statusCode = 409
  return error
}

const isDuplicateNullUserIdError = (error) => {
  if (!error || error.code !== 11000) {
    return false
  }

  return (
    String(error.message || '').includes('userId_1') &&
    String(error.message || '').includes('dup key: { userId: null')
  )
}

const generatePatientId = () => {
  const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  const randomPart = crypto.randomBytes(2).toString('hex').toUpperCase()
  return `PAT-${datePart}-${randomPart}`
}

const normalizePatientId = (value) => String(value || '').trim().toUpperCase()

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const normalizeStringArray = (values) =>
  Array.isArray(values)
    ? values
        .map((value) => String(value || '').trim())
        .filter(Boolean)
    : []

const normalizeAllergies = (values) =>
  Array.isArray(values)
    ? values
        .map((entry) => ({
          substance: String(entry?.substance || '').trim(),
          severity: String(entry?.severity || 'Mild').trim() || 'Mild',
        }))
        .filter((entry) => entry.substance)
    : []

const normalizeWeight = (value) => {
  if (value === '' || value === null || value === undefined) {
    return null
  }

  const numericValue = Number(value)
  return Number.isFinite(numericValue) ? numericValue : value
}

const buildPatientQuery = (filters = {}) => {
  const query = {}
  const term = String(filters.q || '').trim()

  if (term) {
    const regex = new RegExp(escapeRegex(term), 'i')
    query.$or = [{ patientId: regex }, { name: regex }]
  }

  return query
}

export const listPatients = async (filters = {}) => {
  const query = buildPatientQuery(filters)
  const { page, limit, skip } = getPagination(filters)

  const [patients, total] = await Promise.all([
    Patient.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Patient.countDocuments(query),
  ])

  return {
    patients,
    pagination: buildPagination({ page, limit, total }),
  }
}

export const getPatientById = async (id) => {
  const patient = await Patient.findById(id)

  if (!patient) {
    throw patientNotFound()
  }

  return patient
}

export const getPatientByUserId = async (userId) => {
  const patient = await Patient.findOne({ userId })

  if (!patient) {
    throw patientNotFound()
  }

  return patient
}

export const createPatient = async (payload) => {
  let patientId = normalizePatientId(payload.patientId)

  if (!patientId) {
    let existingPatient = null

    for (let attempt = 0; attempt < 5; attempt += 1) {
      patientId = generatePatientId()
      existingPatient = await Patient.findOne({ patientId })

      if (!existingPatient) {
        break
      }
    }

    if (existingPatient) {
      throw duplicatePatientError()
    }
  } else {
    const existingPatient = await Patient.findOne({ patientId })

    if (existingPatient) {
      throw duplicatePatientError()
    }
  }

  const patientPayload = {
    patientId,
    name: String(payload.name || '').trim(),
    dob: payload.dob,
    gender: payload.gender,
    weight: normalizeWeight(payload.weight),
    allergies: normalizeAllergies(payload.allergies),
    medicalHistory: normalizeStringArray(payload.medicalHistory),
  }

  let patient = null

  try {
    patient = await Patient.create(patientPayload)
  } catch (error) {
    if (!isDuplicateNullUserIdError(error)) {
      throw error
    }

    // Heal old records where userId is persisted as null under unique sparse index.
    await Patient.updateMany({ userId: null }, { $unset: { userId: 1 } })
    patient = await Patient.create(patientPayload)
  }

  return patient
}

const splitName = (fullName = '') => {
  const parts = String(fullName || '').trim().split(/\s+/).filter(Boolean)

  if (parts.length <= 1) {
    return {
      firstName: parts[0] || 'Patient',
      lastName: 'User',
    }
  }

  return {
    firstName: parts.shift(),
    lastName: parts.join(' '),
  }
}

export const createPatientPortalAccount = async (patientId, payload = {}) => {
  const patient = await Patient.findById(patientId)

  if (!patient) {
    throw patientNotFound()
  }

  if (patient.userId) {
    const error = new Error('Patient portal account already exists')
    error.statusCode = 409
    throw error
  }

  const password = String(payload.password || generatePassword())

  const { firstName, lastName } = splitName(patient.name)
  const user = await createUser({
    firstName: String(payload.firstName || firstName).trim(),
    lastName: String(payload.lastName || lastName).trim(),
    email: payload.email,
    password,
    role: 'PATIENT',
    isActive: payload.isActive ?? true,
  })

  await Patient.findByIdAndUpdate(patient._id, { userId: user._id }, { new: true, runValidators: true })

  const linkedPatient = await getPatientById(patient._id)

  return {
    patient: linkedPatient,
    user,
    access: {
      email: user.email,
      password,
      loginUrl: String(process.env.CLIENT_URL || '').replace(/\/+$/, '')
        ? `${String(process.env.CLIENT_URL || '').replace(/\/+$/, '')}/patient/access`
        : '/patient/access',
    },
  }
}
