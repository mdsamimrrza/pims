import { createUser, deleteUser, getUserById, listUsers, permanentlyDeleteUser, updateUser } from '../services/user.service.js'
import { sendError, sendSuccess } from '../utils/responseHandler.js'

export const getAllUsers = async (_req, res) => {
  try {
    const { users, pagination } = await listUsers(_req.query || {})
    return sendSuccess(res, { users, pagination }, 'Users loaded')
  } catch (error) {
    return sendError(res, error.message || 'Failed to load users', error.statusCode || 500)
  }
}

export const getSingleUser = async (req, res) => {
  try {
    const user = await getUserById(req.params.id)
    return sendSuccess(res, { user }, 'User loaded')
  } catch (error) {
    return sendError(res, error.message || 'Failed to load user', error.statusCode || 500)
  }
}

export const createNewUser = async (req, res) => {
  try {
    const { firstName, lastName, email, password, role, isActive } = req.body || {}

    if (!firstName || !lastName || !email || !password || !role) {
      return sendError(res, 'firstName, lastName, email, password and role are required', 400)
    }

    const user = await createUser({ firstName, lastName, email, password, role, isActive })
    return sendSuccess(res, { user }, 'User created', 201)
  } catch (error) {
    return sendError(res, error.message || 'Failed to create user', error.statusCode || 500)
  }
}

export const updateExistingUser = async (req, res) => {
  try {
    const targetUserId = String(req.params.id || '')
    const currentUserId = String(req.user?.id || req.user?._id || '')
    const requestedIsActive = req.body?.isActive

    if (targetUserId && currentUserId && targetUserId === currentUserId && requestedIsActive === false) {
      return sendError(res, 'You cannot deactivate your own account while logged in', 400)
    }

    const user = await updateUser(req.params.id, req.body || {})
    return sendSuccess(res, { user }, 'User updated')
  } catch (error) {
    return sendError(res, error.message || 'Failed to update user', error.statusCode || 500)
  }
}

export const removeUser = async (req, res) => {
  try {
    const targetUserId = String(req.params.id || '')
    const currentUserId = String(req.user?.id || req.user?._id || '')

    if (targetUserId && currentUserId && targetUserId === currentUserId) {
      return sendError(res, 'You cannot deactivate your own account while logged in', 400)
    }

    const user = await deleteUser(req.params.id)
    return sendSuccess(res, { user }, 'User deactivated')
  } catch (error) {
    return sendError(res, error.message || 'Failed to deactivate user', error.statusCode || 500)
  }
}

export const removeUserPermanently = async (req, res) => {
  try {
    const targetUserId = String(req.params.id || '')
    const currentUserId = String(req.user?.id || req.user?._id || '')

    if (targetUserId && currentUserId && targetUserId === currentUserId) {
      return sendError(res, 'You cannot permanently delete your own account', 400)
    }

    const user = await permanentlyDeleteUser(req.params.id)
    return sendSuccess(res, { user }, 'User permanently deleted')
  } catch (error) {
    return sendError(res, error.message || 'Failed to permanently delete user', error.statusCode || 500)
  }
}
