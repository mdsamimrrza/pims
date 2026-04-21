import { Router } from 'express'
import { createNewUser, getAllUsers, getSingleUser, removeUser, removeUserPermanently, updateExistingUser } from '../controllers/user.controller.js'
import { verifyToken } from '../middlewares/auth.middleware.js'
import { requireRole } from '../middlewares/role.middleware.js'
import {
  validateCreateUser,
  validateUpdateUser,
  validateUserIdParam,
  validateUserQuery,
} from '../validators/user.validator.js'

const router = Router()

router.use(verifyToken)
router.use(requireRole('ADMIN'))

router.get('/', validateUserQuery, getAllUsers)
router.post('/', validateCreateUser, createNewUser)
router.delete('/:id/permanent', validateUserIdParam, removeUserPermanently)
router.get('/:id', validateUserIdParam, getSingleUser)
router.put('/:id', validateUpdateUser, updateExistingUser)
router.delete('/:id', validateUserIdParam, removeUser)

export default router
