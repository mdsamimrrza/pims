import {
  createValidator,
  optionalDate,
  optionalEnum,
  optionalNonNegativeNumber,
  optionalNumberRange,
  optionalString,
  optionalStringArray,
  requireDate,
  requireEmail,
  requireNonEmptyString,
  requireObjectId,
} from './validate.js'

const GENDERS = ['Male', 'Female', 'Other']
const ALLERGY_SEVERITIES = ['Severe', 'Moderate', 'Mild']

const validateAllergies = (errors, allergies) => {
  if (allergies === undefined) {
    return
  }

  if (!Array.isArray(allergies)) {
    errors.push({ field: 'allergies', message: 'allergies must be an array' })
    return
  }

  allergies.forEach((allergy, index) => {
    if (!allergy || typeof allergy !== 'object') {
      errors.push({ field: `allergies[${index}]`, message: 'allergy entry must be an object' })
      return
    }

    if (!String(allergy.substance || '').trim()) {
      errors.push({ field: `allergies[${index}].substance`, message: 'substance is required' })
    }

    if (
      allergy.severity !== undefined &&
      !ALLERGY_SEVERITIES.includes(allergy.severity)
    ) {
      errors.push({
        field: `allergies[${index}].severity`,
        message: `severity must be one of: ${ALLERGY_SEVERITIES.join(', ')}`,
      })
    }
  })
}

export const validatePatientIdParam = createValidator((req) => {
  const errors = []
  requireObjectId(errors, 'id', req.params?.id)
  return errors
})

export const validatePatientQuery = createValidator((req) => {
  const errors = []
  optionalString(errors, 'q', req.query?.q)
  optionalNumberRange(errors, 'page', req.query?.page, 1, 1000000)
  optionalNumberRange(errors, 'limit', req.query?.limit, 1, 100)
  return errors
})

export const validateCreatePatient = createValidator((req) => {
  const errors = []
  const body = req.body || {}

  requireNonEmptyString(errors, 'name', body.name)
  requireDate(errors, 'dob', body.dob)
  optionalEnum(errors, 'gender', body.gender, GENDERS)
  optionalNonNegativeNumber(errors, 'weight', body.weight)
  optionalStringArray(errors, 'medicalHistory', body.medicalHistory)
  validateAllergies(errors, body.allergies)

  return errors
})

export const validateCreatePatientPortalAccount = createValidator((req) => {
  const errors = []
  const body = req.body || {}

  requireEmail(errors, 'email', body.email)
  requireNonEmptyString(errors, 'password', body.password)
  optionalString(errors, 'firstName', body.firstName)
  optionalString(errors, 'lastName', body.lastName)

  return errors
})
