import Medicine from '../models/Medicine.model.js'

const notFoundError = () => {
  const error = new Error('Medicine not found')
  error.statusCode = 404
  return error
}

const duplicateError = () => {
  const error = new Error('Medicine already exists')
  error.statusCode = 409
  return error
}

const normalizeAtcCode = (value) => String(value || '').trim().toUpperCase()
const normalizeString = (value) => String(value || '').trim()

const getPagination = (filters = {}) => {
  const page = Math.max(1, Number(filters.page) || 1)
  const limit = Math.min(100, Math.max(1, Number(filters.limit) || 20))

  return {
    page,
    limit,
    skip: (page - 1) * limit,
  }
}

const buildMedicineQuery = (filters = {}) => {
  const query = {}

  if (filters.atcCode) {
    const normalizedAtcCode = normalizeAtcCode(filters.atcCode)
    // Force prefix match if code is a top-level category (1-4 chars) or flag is set
    const isTopLevel = normalizedAtcCode.length <= 4
    const includeDescendants = filters.includeDescendants === true || filters.includeDescendants === 'true' || isTopLevel

    query.atcCode = includeDescendants
      ? { $regex: `^${normalizedAtcCode}`, $options: 'i' }
      : { $regex: `^${normalizedAtcCode}$`, $options: 'i' }
  }

  if (filters.q) {
    const regex = new RegExp(String(filters.q).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
    query.$or = [{ name: regex }, { genericName: regex }, { brand: regex }]
  }

  return query
}

const buildMedicineUniquenessQuery = (payload, excludeId = null) => {
  const query = {
    name: normalizeString(payload.name),
    genericName: normalizeString(payload.genericName),
    brand: normalizeString(payload.brand),
    atcCode: normalizeAtcCode(payload.atcCode),
    strength: normalizeString(payload.strength),
    dosageForm: payload.dosageForm || 'Tablet',
  }

  if (excludeId) {
    query._id = { $ne: excludeId }
  }

  return query
}

export const listMedicines = async (filters = {}) => {
  const query = buildMedicineQuery(filters)
  const { page, limit, skip } = getPagination(filters)

  const [medicines, total] = await Promise.all([
    Medicine.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Medicine.countDocuments(query),
  ])

  return {
    medicines,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    },
  }
}

export const getMedicineById = async (id) => {
  const medicine = await Medicine.findById(id)

  if (!medicine) {
    throw notFoundError()
  }

  return medicine
}

export const createMedicine = async (payload) => {
  const duplicateMedicine = await Medicine.findOne(buildMedicineUniquenessQuery(payload))

  if (duplicateMedicine) {
    throw duplicateError()
  }

  const medicine = await Medicine.create({
    ...payload,
    atcCode: normalizeAtcCode(payload.atcCode),
  })

  return medicine
}

export const updateMedicine = async (id, payload) => {
  const updates = { ...payload }

  if (updates.atcCode) {
    updates.atcCode = normalizeAtcCode(updates.atcCode)
  }

  const currentMedicine = await Medicine.findById(id)

  if (!currentMedicine) {
    throw notFoundError()
  }

  const duplicateMedicine = await Medicine.findOne(
    buildMedicineUniquenessQuery(
      {
        name: updates.name ?? currentMedicine.name,
        genericName: updates.genericName ?? currentMedicine.genericName,
        brand: updates.brand ?? currentMedicine.brand,
        atcCode: updates.atcCode ?? currentMedicine.atcCode,
        strength: updates.strength ?? currentMedicine.strength,
        dosageForm: updates.dosageForm ?? currentMedicine.dosageForm,
      },
      id
    )
  )

  if (duplicateMedicine) {
    throw duplicateError()
  }

  const medicine = await Medicine.findByIdAndUpdate(id, updates, {
    new: true,
    runValidators: true,
  })

  if (!medicine) {
    throw notFoundError()
  }

  return medicine
}

// ATC Interaction Knowledge Base
const KNOWN_INTERACTIONS = [
  { drugs: ['M01A', 'C09'], severity: 'Warning', description: 'NSAIDs + ACE Inhibitors may reduce renal function.' },
  { drugs: ['J01FA', 'C10AA'], severity: 'Critical', description: 'Macrolides + Statins increases risk of myopathy.' },
  { drugs: ['B01AA', 'M01A'], severity: 'Critical', description: 'Warfarin + NSAIDs increases bleeding risk.' },
  { drugs: ['C07', 'C08'], severity: 'Warning', description: 'Beta-blockers + Calcium channel blockers may cause bradycardia.' }
]

export const checkDrugInteractions = async (newDrugAtc, existingAtcCodes = []) => {
  if (!newDrugAtc || existingAtcCodes.length === 0) {
    return { status: 'Clear', interactions: [] }
  }

  const interactions = []
  const newAtc = normalizeAtcCode(newDrugAtc)

  for (const existing of existingAtcCodes) {
    const existingAtc = normalizeAtcCode(existing)
    
    for (const rule of KNOWN_INTERACTIONS) {
      if ((newAtc.startsWith(rule.drugs[0]) && existingAtc.startsWith(rule.drugs[1])) ||
          (newAtc.startsWith(rule.drugs[1]) && existingAtc.startsWith(rule.drugs[0]))) {
        interactions.push({ severity: rule.severity, description: rule.description, involved: [newAtc, existingAtc] })
      }
    }

    if (newAtc && existingAtc && newAtc.substring(0, 5) === existingAtc.substring(0, 5) && newAtc !== existingAtc) {
      interactions.push({ severity: 'Warning', description: 'Therapeutic duplication.', involved: [newAtc, existingAtc] })
    }
  }

  let status = 'Clear'
  if (interactions.length > 0) {
    status = interactions.some(i => i.severity === 'Critical') ? 'Critical' : 'Warning'
  }

  return { status, interactions }
}

export const removeMedicine = async (id) => {
  const medicine = await Medicine.findByIdAndDelete(id)

  if (!medicine) {
    throw notFoundError()
  }

  return medicine
}
