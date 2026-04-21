import mongoose from 'mongoose'
import Inventory from '../models/Inventory.model.js'
import Medicine from '../models/Medicine.model.js'
import { createAlert } from './alert.service.js'
import { buildPagination, getPagination } from '../utils/pagination.js'

const INVENTORY_STATUSES = ['STABLE', 'LOW STOCK', 'NEAR EXPIRY', 'EXPIRED']

const inventoryNotFound = () => {
  const error = new Error('Inventory item not found')
  error.statusCode = 404
  return error
}

const validationError = (message) => {
  const error = new Error(message)
  error.statusCode = 400
  return error
}

const normalizeAtcCode = (value) => String(value || '').trim().toUpperCase()

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const ensureObjectId = (value, label) => {
  if (!mongoose.isValidObjectId(value)) {
    throw validationError(`Invalid ${label}`)
  }
}

const normalizeNumber = (value, label) => {
  const normalized = Number(value)

  if (!Number.isFinite(normalized) || normalized < 0) {
    throw validationError(`${label} must be a non-negative number`)
  }

  return normalized
}

const normalizeExpiryDate = (value) => {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    throw validationError('expiryDate must be a valid date')
  }

  return date
}

const getInventoryRiskFlags = ({ currentStock, threshold, expiryDate }) => {
  const now = new Date()
  const expiry = new Date(expiryDate)
  const thirtyDaysFromNow = new Date(now)
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30)

  return {
    isExpired: expiry < now,
    isNearExpiry: expiry >= now && expiry <= thirtyDaysFromNow,
    isLowStock: Number(currentStock) < Number(threshold),
  }
}

const resolveInventoryStatus = ({ currentStock, threshold, expiryDate }) => {
  const { isExpired, isNearExpiry, isLowStock } = getInventoryRiskFlags({
    currentStock,
    threshold,
    expiryDate,
  })

  if (isExpired) {
    return 'EXPIRED'
  }

  if (isLowStock) {
    return 'LOW STOCK'
  }

  if (isNearExpiry) {
    return 'NEAR EXPIRY'
  }

  return 'STABLE'
}

const summarizeInventory = (items) => {
  return items.reduce(
    (summary, item) => {
      summary.totalItems += 1
      summary.totalUnits += Number(item.currentStock || 0)
      summary.inventoryValue += Number(item.currentStock || 0) * Number(item.medicineId?.mrp || 0)

      if (item.status === 'LOW STOCK') {
        summary.lowStockCount += 1
      }

      if (item.status === 'NEAR EXPIRY') {
        summary.nearExpiryCount += 1
      }

      if (item.status === 'EXPIRED') {
        summary.expiredCount += 1
      }

      return summary
    },
    {
      totalItems: 0,
      totalUnits: 0,
      inventoryValue: 0,
      lowStockCount: 0,
      nearExpiryCount: 0,
      expiredCount: 0,
    }
  )
}

const createAlertFromInventoryItem = async (item) => {
  const medicineName = item?.medicineId?.name || item?.medicineId?.genericName || item?.atcCode
  const { isExpired, isNearExpiry, isLowStock } = getInventoryRiskFlags(item)

  if (isLowStock) {
    await createAlert({
      type: 'LOW_STOCK',
      severity: 'CRITICAL',
      medicineId: item.medicineId?._id || item.medicineId,
      message: `${medicineName} stock (${item.currentStock}) is below threshold (${item.threshold})`,
    })
  }

  if (isNearExpiry) {
    await createAlert({
      type: 'NEAR_EXPIRY',
      severity: 'WARNING',
      medicineId: item.medicineId?._id || item.medicineId,
      message: `${medicineName} batch ${item.batchId} is nearing expiry on ${new Date(
        item.expiryDate
      ).toLocaleDateString()}`,
    })
  }

  if (isExpired) {
    await createAlert({
      type: 'EXPIRED',
      severity: 'CRITICAL',
      medicineId: item.medicineId?._id || item.medicineId,
      message: `${medicineName} batch ${item.batchId} expired on ${new Date(item.expiryDate).toLocaleDateString()}`,
    })
  }
}

const normalizePrescriptionQuantity = (value) => {
  if (value === undefined || value === null || value === '') {
    return 1
  }

  const quantity = Number(value)

  if (!Number.isFinite(quantity) || quantity < 1) {
    throw validationError('Prescription quantity must be a positive number')
  }

  return Math.ceil(quantity)
}

const buildInventoryConsumptionQuery = (item) => {
  const query = {
    currentStock: { $gt: 0 },
    status: { $ne: 'EXPIRED' },
  }

  if (item?.medicineId) {
    query.medicineId = item.medicineId
    return query
  }

  const atcCode = normalizeAtcCode(item?.atcCode)

  if (!atcCode) {
    throw validationError('Each prescription item requires a medicineId or atcCode to consume stock')
  }

  query.atcCode = atcCode
  return query
}

const consumeInventoryForItem = async (item) => {
  const quantity = normalizePrescriptionQuantity(item?.quantity)
  const query = buildInventoryConsumptionQuery(item)
  const batches = await Inventory.find(query).sort({ expiryDate: 1, createdAt: 1 })
  const availableStock = batches.reduce((total, batch) => total + Number(batch.currentStock || 0), 0)
  const medicineName = item?.medicineId?.name || item?.medicineId?.genericName || item?.atcCode

  if (availableStock < quantity) {
    throw validationError(
      `Insufficient stock for ${medicineName}. Available ${availableStock}, required ${quantity}`
    )
  }

  let remaining = quantity
  const updatedBatches = []

  for (const batch of batches) {
    if (remaining <= 0) {
      break
    }

    const currentStock = Number(batch.currentStock || 0)
    const consumed = Math.min(currentStock, remaining)

    if (consumed <= 0) {
      continue
    }

    batch.currentStock = currentStock - consumed
    batch.status = resolveInventoryStatus({
      currentStock: batch.currentStock,
      threshold: batch.threshold,
      expiryDate: batch.expiryDate,
    })

    await batch.save()

    const populatedBatch = await populateInventoryQuery(Inventory.findById(batch._id))
    await createAlertFromInventoryItem(populatedBatch)
    updatedBatches.push(populatedBatch)
    remaining -= consumed
  }

  return updatedBatches
}

export const consumeInventoryForPrescriptionItems = async (items = []) => {
  if (!Array.isArray(items) || items.length === 0) {
    return []
  }

  const affectedBatches = []

  for (const item of items) {
    const updatedBatches = await consumeInventoryForItem(item)
    affectedBatches.push(...updatedBatches)
  }

  return affectedBatches
}

export const getInventoryStatus = resolveInventoryStatus
export const syncInventoryAlertsForItem = createAlertFromInventoryItem
export const getInventoryRiskSummary = getInventoryRiskFlags

const populateInventoryQuery = (query) =>
  query.populate('medicineId', 'name genericName brand atcCode strength dosageForm manufacturer')

const buildInventoryQuery = (filters = {}) => {
  const query = {}

  if (filters.status && INVENTORY_STATUSES.includes(filters.status)) {
    query.status = filters.status
  }

  if (filters.medicineId) {
    query.medicineId = filters.medicineId
  }

  if (filters.atcCode) {
    query.atcCode = normalizeAtcCode(filters.atcCode)
  }

  if (filters.q) {
    const regex = new RegExp(escapeRegex(String(filters.q).trim()), 'i')
    query.$or = [{ batchId: regex }, { atcCode: regex }]
  }

  return query
}

const getMedicineForInventory = async (medicineId) => {
  ensureObjectId(medicineId, 'medicineId')

  const medicine = await Medicine.findById(medicineId)

  if (!medicine) {
    throw validationError('Medicine not found')
  }

  return medicine
}

const normalizeInventoryPayload = async (payload, existingItem = null) => {
  const medicineId = payload.medicineId || existingItem?.medicineId

  if (!medicineId) {
    throw validationError('medicineId is required')
  }

  const medicine = await getMedicineForInventory(medicineId)
  const currentStock = normalizeNumber(
    payload.currentStock ?? existingItem?.currentStock,
    'currentStock'
  )
  const threshold = normalizeNumber(payload.threshold ?? existingItem?.threshold, 'threshold')
  const expiryDate = normalizeExpiryDate(payload.expiryDate ?? existingItem?.expiryDate)
  const batchId = String(payload.batchId ?? existingItem?.batchId ?? '').trim()

  if (!batchId) {
    throw validationError('batchId is required')
  }

  const atcCode = normalizeAtcCode(payload.atcCode || medicine.atcCode)

  return {
    medicineId: medicine._id,
    atcCode,
    batchId,
    currentStock,
    threshold,
    expiryDate,
    storage: String(payload.storage ?? existingItem?.storage ?? '').trim(),
    status: resolveInventoryStatus({ currentStock, threshold, expiryDate }),
  }
}

export const listInventory = async (filters = {}) => {
  const query = buildInventoryQuery(filters)
  const { page, limit, skip } = getPagination(filters)

  const [items, total] = await Promise.all([
    populateInventoryQuery(Inventory.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit)),
    Inventory.countDocuments(query),
  ])

  return {
    items,
    pagination: buildPagination({ page, limit, total }),
  }
}

export const getInventoryAudit = async (filters = {}) => {
  const query = buildInventoryQuery(filters)
  const { page, limit, skip } = getPagination(filters, { defaultLimit: 50, maxLimit: 250 })

  const [items, total] = await Promise.all([
    populateInventoryQuery(Inventory.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit)),
    Inventory.countDocuments(query),
  ])

  return {
    summary: summarizeInventory(items),
    items,
    pagination: buildPagination({ page, limit, total }),
  }
}

export const createInventoryItem = async (payload) => {
  const normalizedPayload = await normalizeInventoryPayload(payload)

  const existingItem = await Inventory.findOne({
    medicineId: normalizedPayload.medicineId,
    batchId: normalizedPayload.batchId,
  })

  if (existingItem) {
    const error = new Error('Inventory batch already exists for this medicine')
    error.statusCode = 409
    throw error
  }

  const item = await Inventory.create(normalizedPayload)
  const populatedItem = await populateInventoryQuery(Inventory.findById(item._id))
  await createAlertFromInventoryItem(populatedItem)
  return populatedItem
}

export const updateInventoryItem = async (id, payload) => {
  ensureObjectId(id, 'inventory id')

  const existingItem = await Inventory.findById(id)

  if (!existingItem) {
    throw inventoryNotFound()
  }

  const normalizedPayload = await normalizeInventoryPayload(payload, existingItem)

  const conflictingItem = await Inventory.findOne({
    _id: { $ne: existingItem._id },
    medicineId: normalizedPayload.medicineId,
    batchId: normalizedPayload.batchId,
  })

  if (conflictingItem) {
    const error = new Error('Inventory batch already exists for this medicine')
    error.statusCode = 409
    throw error
  }

  const item = await Inventory.findByIdAndUpdate(id, normalizedPayload, {
    new: true,
    runValidators: true,
  })

  if (!item) {
    throw inventoryNotFound()
  }

  const populatedItem = await populateInventoryQuery(Inventory.findById(item._id))
  await createAlertFromInventoryItem(populatedItem)
  return populatedItem
}

export const deleteInventoryItem = async (id) => {
  ensureObjectId(id, 'inventory id')

  const item = await Inventory.findByIdAndDelete(id)

  if (!item) {
    throw inventoryNotFound()
  }

  return item
}
