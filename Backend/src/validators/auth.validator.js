import { ROLES } from '../utils/constants.js'
import {
  createValidator,
  optionalEnum,
  requireEmail,
  requireNonEmptyString,
  requireStrongPassword,
  optionalString,
} from './validate.js'

export const validateLogin = createValidator((req) => {
  const errors = []
  const body = req.body || {}

  requireEmail(errors, 'email', body.email)
  requireNonEmptyString(errors, 'password', body.password)
  optionalEnum(errors, 'role', body.role, Object.values(ROLES))

  return errors
})

export const validateSetupAdmin = createValidator((req) => {
  const errors = []
  const body = req.body || {}

  requireNonEmptyString(errors, 'setupToken', body.setupToken)
  if (body.setupToken && String(body.setupToken).length < 6) {
    errors.push({ field: 'setupToken', message: 'setupToken must be at least 6 characters long' })
  }
  requireNonEmptyString(errors, 'firstName', body.firstName)
  requireNonEmptyString(errors, 'lastName', body.lastName)
  requireEmail(errors, 'email', body.email)
  requireStrongPassword(errors, 'password', body.password)
  optionalString(errors, 'confirmPassword', body.confirmPassword)

  if (body.confirmPassword !== undefined && body.password !== body.confirmPassword) {
    errors.push({ field: 'confirmPassword', message: 'confirmPassword must match password' })
  }

  return errors
})

export const validateForgotPassword = createValidator((req) => {
  const errors = []
  requireEmail(errors, 'email', req.body?.email)
  return errors
})

export const validateResetPassword = createValidator((req) => {
  const errors = []
  const body = req.body || {}

  requireEmail(errors, 'email', body.email)
  requireNonEmptyString(errors, 'token', body.token)
  requireStrongPassword(errors, 'newPassword', body.newPassword)
  requireNonEmptyString(errors, 'confirmPassword', body.confirmPassword)

  if (body.newPassword !== body.confirmPassword) {
    errors.push({ field: 'confirmPassword', message: 'confirmPassword must match newPassword' })
  }

  return errors
})

export const validateChangePassword = createValidator((req) => {
  const errors = []
  const body = req.body || {}

  requireNonEmptyString(errors, 'currentPassword', body.currentPassword)
  requireStrongPassword(errors, 'newPassword', body.newPassword)
  requireNonEmptyString(errors, 'confirmPassword', body.confirmPassword)

  if (body.newPassword !== body.confirmPassword) {
    errors.push({ field: 'confirmPassword', message: 'confirmPassword must match newPassword' })
  }

  return errors
})
