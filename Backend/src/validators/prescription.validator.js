import {
  createValidator,
  optionalBoolean,
  optionalBooleanQuery,
  optionalEnum,
  optionalNumberRange,
  optionalObjectId,
  optionalString,
  requireArray,
  requireDate,
  requireEmail,
  requireObjectId,
  requireNonEmptyString,
} from './validate.js'

const PRESCRIPTION_STATUSES = ['Draft', 'Pending', 'Processing', 'Filled', 'Cancelled']

const validatePrescriptionItems = (errors, items) => {
  if (!Array.isArray(items) || items.length === 0) {
    return
  }

  items.forEach((item, index) => {
    if (!item || typeof item !== 'object') {
      errors.push({ field: `items[${index}]`, message: 'prescription item must be an object' })
      return
    }

    if (item.medicineId !== undefined && item.medicineId !== null) {
      optionalObjectId(errors, `items[${index}].medicineId`, item.medicineId)
    }

    if (!String(item.dose || '').trim()) {
      errors.push({ field: `items[${index}].dose`, message: 'dose is required' })
    }

    optionalNumberRange(errors, `items[${index}].quantity`, item.quantity, 1, 1000000)

    if (!String(item.frequency || '').trim()) {
      errors.push({ field: `items[${index}].frequency`, message: 'frequency is required' })
    }

    if (!String(item.atcCode || '').trim() && !item.medicineId) {
      errors.push({
        field: `items[${index}].atcCode`,
        message: 'atcCode is required when medicineId is not provided',
      })
    }

    optionalString(errors, `items[${index}].route`, item.route)
    optionalString(errors, `items[${index}].instructions`, item.instructions)
  })
}

export const validatePrescriptionIdParam = createValidator((req) => {
  const errors = []
  requireObjectId(errors, 'id', req.params?.id)
  return errors
})

export const validatePrescriptionQuery = createValidator((req) => {
  const errors = []
  const query = req.query || {}

  optionalEnum(errors, 'status', query.status, PRESCRIPTION_STATUSES)
  optionalObjectId(errors, 'doctorId', query.doctorId)
  optionalObjectId(errors, 'patientId', query.patientId)
  optionalBooleanQuery(errors, 'isUrgent', query.isUrgent)
  optionalString(errors, 'q', query.q)
  optionalNumberRange(errors, 'page', query.page, 1, 1000000)
  optionalNumberRange(errors, 'limit', query.limit, 1, 100)

  return errors
})

export const validateCreatePrescription = createValidator((req) => {
  const errors = []
  const body = req.body || {}
  const isDraft = body.isDraft === true

  if (body.patientId) {
    requireObjectId(errors, 'patientId', body.patientId)
  } else {
    const patient = body.patient || {}
    requireNonEmptyString(errors, 'patient.name', patient.name)
    
    // DOB and Email are optional for drafts
    if (!isDraft) {
      requireDate(errors, 'patient.dob', patient.dob)
      requireEmail(errors, 'patient.email', patient.email)
    } else {
      optionalDate(errors, 'patient.dob', patient.dob)
      optionalEmail(errors, 'patient.email', patient.email)
    }
    
    optionalString(errors, 'patient.gender', patient.gender)
    optionalString(errors, 'patient.allergiesText', patient.allergiesText)
  }

  if (isDraft) {
    if (body.items !== undefined) {
      validatePrescriptionItems(errors, body.items)
    }
  } else {
    requireArray(errors, 'items', body.items)
    validatePrescriptionItems(errors, body.items)
  }

  optionalString(errors, 'diagnosis', body.diagnosis)
  optionalBoolean(errors, 'isUrgent', body.isUrgent)
  optionalNumberRange(errors, 'allowRefills', body.allowRefills, 0, 3)
  optionalString(errors, 'digitalSignature', body.digitalSignature)
  optionalString(errors, 'pdfUrl', body.pdfUrl)

  return errors
})

export const validateUpdatePrescriptionStatus = createValidator((req) => {
  const errors = []
  requireObjectId(errors, 'id', req.params?.id)
  optionalEnum(errors, 'status', req.body?.status, ['Processing', 'Filled', 'Cancelled'])

  if (!req.body || req.body.status === undefined) {
    errors.push({
      field: 'status',
      message: 'status must be one of: Processing, Filled, Cancelled',
    })
  }

  return errors
})
