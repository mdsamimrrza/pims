import User from '../models/User.model.js'
import { sendInviteEmail } from './email.service.js'
import { hashPassword } from '../utils/password.js'
import { ROLES } from '../utils/constants.js'

const markPasswordChangedAt = () => new Date(Date.now() - 1000)

const getPrimaryClientOrigin = () => {
  const allOrigins = String(process.env.CLIENT_URL || 'http://localhost:5173')
    .split(',')
    .map((url) => String(url || '').trim().replace(/\/+$/, ''))
    .filter(Boolean)

  return allOrigins.find((url) => !url.includes('localhost')) || allOrigins[0] || ''
}

const getRoleAccessUrl = (role) => {
  const clientUrl = getPrimaryClientOrigin()
  const accessPath = {
    [ROLES.DOCTOR]: '/doctor/access',
    [ROLES.PHARMACIST]: '/pharmacist/access',
    [ROLES.ADMIN]: '/admin/access',
    [ROLES.PATIENT]: '/patient/access',
  }[role] || '/doctor/access'

  return clientUrl ? `${clientUrl}${accessPath}` : accessPath
}

const userNotFound = () => {
  const error = new Error('User not found')
  error.statusCode = 404
  return error
}

const buildUserQuery = (filters = {}) => {
  const query = {}

  if (filters.role) {
    query.role = filters.role
  }

  if (filters.isActive === 'true') {
    query.isActive = true
  }

  if (filters.isActive === 'false') {
    query.isActive = false
  }

  if (filters.q) {
    const regex = new RegExp(String(filters.q).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
    query.$or = [{ firstName: regex }, { lastName: regex }, { email: regex }]
  }

  return query
}

const getPagination = (filters = {}) => {
  const page = Math.max(1, Number(filters.page) || 1)
  const limit = Math.min(100, Math.max(1, Number(filters.limit) || 20))

  return {
    page,
    limit,
    skip: (page - 1) * limit,
  }
}

export const listUsers = async (filters = {}) => {
  const query = buildUserQuery(filters)
  const { page, limit, skip } = getPagination(filters)

  const [users, total] = await Promise.all([
    User.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit),
    User.countDocuments(query),
  ])

  return {
    users: users.map((user) => user.toSafeObject()),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    },
  }
}

export const getUserById = async (id) => {
  const user = await User.findById(id)

  if (!user) {
    throw userNotFound()
  }

  return user.toSafeObject()
}

export const createUser = async ({ firstName, lastName, email, password, role, isActive = true }) => {
  const normalizedEmail = String(email || '').trim().toLowerCase()
  const existingUser = await User.findOne({ email: normalizedEmail })

  if (existingUser) {
    const error = new Error('Email already exists')
    error.statusCode = 409
    throw error
  }

  const user = await User.create({
    firstName,
    lastName,
    email: normalizedEmail,
    passwordHash: hashPassword(password),
    role,
    isActive,
    passwordChangedAt: markPasswordChangedAt(),
  })

  let inviteEmail = {
    delivered: false,
    mode: 'unknown',
  }

  try {
    inviteEmail = await sendInviteEmail({
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
      password,
      loginUrl: getRoleAccessUrl(user.role),
    })
  } catch (error) {
    inviteEmail = {
      delivered: false,
      mode: 'smtp',
      error: error.message,
    }
    console.warn(`Failed to write invite email for ${user.email}: ${error.message}`)
  }

  return {
    ...user.toSafeObject(),
    inviteEmail,
  }
}

export const updateUser = async (id, updates) => {
  const payload = { ...updates }

  if (payload.email) {
    payload.email = String(payload.email).trim().toLowerCase()
    const existingUser = await User.findOne({ email: payload.email, _id: { $ne: id } })

    if (existingUser) {
      const error = new Error('Email already exists')
      error.statusCode = 409
      throw error
    }
  }

  if (payload.password) {
    payload.passwordHash = hashPassword(payload.password)
    delete payload.password
  }

  const user = await User.findByIdAndUpdate(id, payload, {
    new: true,
    runValidators: true,
  })

  if (!user) {
    throw userNotFound()
  }

  return user.toSafeObject()
}

export const deleteUser = async (id) => {
  const user = await User.findByIdAndUpdate(
    id,
    {
      isActive: false,
      passwordChangedAt: markPasswordChangedAt(),
      passwordResetTokenHash: null,
      passwordResetTokenExpiresAt: null,
    },
    { new: true }
  )

  if (!user) {
    throw userNotFound()
  }

  return user.toSafeObject()
}

export const permanentlyDeleteUser = async (id) => {
  const user = await User.findByIdAndDelete(id)

  if (!user) {
    throw userNotFound()
  }

  return user.toSafeObject()
}
