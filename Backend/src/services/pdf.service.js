import PDFDocument from 'pdfkit'
import { getPrescriptionById } from './prescription.service.js'

// ─────────────────────────────────────────────
//  Errors & Formatters
// ─────────────────────────────────────────────

const notFoundError = () => {
  const err = new Error('Prescription not found')
  err.statusCode = 404
  return err
}

const fmt = {
  date: (v) => {
    if (!v) return 'N/A'
    const d = new Date(v)
    return isNaN(d) ? 'N/A' : d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
  },
  datetime: (v) => {
    if (!v) return 'N/A'
    const d = new Date(v)
    return isNaN(d) ? 'N/A' : d.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  },
  list: (arr) => {
    if (!Array.isArray(arr) || arr.length === 0) return ['None']
    return arr.map((v) => String(v ?? '').trim()).filter(Boolean)
  },
  str: (v) => (v == null || v === '' ? 'N/A' : String(v)),
}

// ─────────────────────────────────────────────
//  Design Tokens
// ─────────────────────────────────────────────

const C = {
  teal:        '#0d9488',
  tealDark:    '#0f766e',
  tealLight:   '#ccfbf1',
  ink:         '#0f172a',
  inkMid:      '#1e293b',
  slate:       '#334155',
  muted:       '#64748b',
  border:      '#e2e8f0',
  borderLight: '#f1f5f9',
  bg:          '#f8fafc',
  white:       '#ffffff',
  urgent:      '#dc2626',
  pending:     '#d97706',
  filled:      '#16a34a',
  cancelled:   '#6b7280',
}

const M     = 50     // page margin
const ROW_H = 18     // base row height
const FTR_H = 36     // footer reserved height
const KW    = 148    // label column width
const KG    = 10     // gap between label and value

// ─────────────────────────────────────────────
//  Utility
// ─────────────────────────────────────────────

const cw    = (doc) => doc.page.width - M * 2
const safe  = (doc) => doc.page.height - M - FTR_H

const guard = (doc, need = 60) => {
  if (doc.y + need > safe(doc)) doc.addPage()
}

const statusColor = (s = '') => {
  switch (s.toLowerCase()) {
    case 'pending':    return C.pending
    case 'processing': return C.teal
    case 'filled':     return C.filled
    case 'cancelled':  return C.cancelled
    default:           return C.muted
  }
}

// ─────────────────────────────────────────────
//  Page Header
// ─────────────────────────────────────────────

const drawHeader = (doc, { compact = false, page = 1 } = {}) => {
  const W  = doc.page.width
  const hH = compact ? 48 : 80

  // Dark background
  doc.rect(0, 0, W, hH).fill(C.ink)
  // Left accent stripe
  doc.rect(0, 0, 4, hH).fill(C.teal)

  if (!compact) {
    // Logo square
    doc.roundedRect(M, 22, 28, 28, 3).fill(C.teal)
    doc.font('Helvetica-Bold').fontSize(13).fillColor(C.white)
       .text('Rx', M + 5, 30, { lineBreak: false })

    // Title
    doc.font('Helvetica-Bold').fontSize(17).fillColor(C.white)
       .text('PIMS', M + 38, 23, { continued: true })
    doc.font('Helvetica').fontSize(17).fillColor(C.teal)
       .text('  Prescription', { continued: true })
    doc.font('Helvetica').fontSize(17).fillColor('#94a3b8')
       .text('  Summary')
    doc.font('Helvetica').fontSize(8).fillColor('#475569')
       .text('Pharmacy Information Management System  •  Confidential Medical Record', M + 38, 46)
  } else {
    doc.font('Helvetica-Bold').fontSize(11).fillColor(C.white)
       .text('PIMS  —  Prescription Summary (continued)', M + 12, 15, { lineBreak: false })
    doc.font('Helvetica').fontSize(8).fillColor('#475569')
       .text('Pharmacy Information Management System', M + 12, 29)
  }

  // Page number
  doc.font('Helvetica').fontSize(8).fillColor('#475569')
     .text(`Page ${page}`, W - M - 60, compact ? 18 : 30, { width: 60, align: 'right', lineBreak: false })

  doc.y = hH + 18
}

// ─────────────────────────────────────────────
//  Page Footer
// ─────────────────────────────────────────────

const drawFooter = (doc, rxId, page, total) => {
  const W  = doc.page.width
  const fY = doc.page.height - M - FTR_H + 10

  doc.strokeColor(C.border).lineWidth(0.5)
     .moveTo(M, fY).lineTo(W - M, fY).stroke()

  // Left — Rx ID
  doc.font('Helvetica-Bold').fontSize(8).fillColor(C.muted).text('Rx ID:  ', M, fY + 8, { continued: true })
  doc.font('Helvetica').fontSize(8).fillColor(C.slate).text(rxId, { lineBreak: false })

  // Center — confidential
  doc.font('Helvetica').fontSize(7).fillColor(C.border)
     .text('— CONFIDENTIAL MEDICAL DOCUMENT —', M, fY + 8, { width: W - M * 2, align: 'center', lineBreak: false })

  // Right — page count
  doc.font('Helvetica').fontSize(8).fillColor(C.muted)
     .text(`${page} / ${total}`, W - M - 50, fY + 8, { width: 50, align: 'right', lineBreak: false })

  // Second row — generated time
  doc.font('Helvetica').fontSize(7).fillColor(C.border)
     .text(`Generated  ${fmt.datetime(new Date())}`, M, fY + 19, { width: W - M * 2, align: 'center', lineBreak: false })
}

// ─────────────────────────────────────────────
//  Section Header
// ─────────────────────────────────────────────

const drawSection = (doc, title) => {
  guard(doc, 44)
  doc.moveDown(0.5)
  const y  = doc.y
  const W  = cw(doc)

  doc.rect(M, y, W, 23).fill(C.bg)
  doc.rect(M, y, 3, 23).fill(C.teal)
  doc.rect(M, y + 22, W, 0.5).fill(C.border)

  doc.font('Helvetica-Bold').fontSize(9)
     .fillColor(C.tealDark)
     .text(title.toUpperCase(), M + 12, y + 7, { characterSpacing: 0.5, lineBreak: false })

  doc.y = y + 31
}

// ─────────────────────────────────────────────
//  Key / Value Row
// ─────────────────────────────────────────────

const kv = (doc, label, value, { color = null, bold = false } = {}) => {
  guard(doc, ROW_H + 6)

  const y   = doc.y
  const vW  = cw(doc) - KW - KG
  const val = fmt.str(value)

  doc.font('Helvetica-Bold').fontSize(9).fillColor(C.muted)
     .text(label, M, y, { width: KW, lineBreak: false })

  doc.font('Helvetica').fontSize(9).fillColor(C.borderLight)
     .text(':', M + KW - 4, y, { lineBreak: false })

  doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(9)
     .fillColor(color ?? (bold ? C.inkMid : C.slate))
     .text(val, M + KW + KG, y, { width: vW, lineBreak: true })

  const tH = doc.heightOfString(val, { width: vW, fontSize: 9 })
  doc.y = y + Math.max(ROW_H, tH) + 2
}

// ─────────────────────────────────────────────
//  Thin Divider
// ─────────────────────────────────────────────

const divider = (doc) => {
  doc.moveDown(0.3)
  doc.strokeColor(C.borderLight).lineWidth(0.5)
     .moveTo(M, doc.y).lineTo(doc.page.width - M, doc.y).stroke()
  doc.moveDown(0.4)
}

// ─────────────────────────────────────────────
//  4-Column Meta Bar
// ─────────────────────────────────────────────

const drawMetaBar = (doc, items) => {
  const barH = 46
  const y    = doc.y
  const W    = cw(doc)
  const colW = Math.floor(W / items.length)

  doc.rect(M, y, W, barH).fill(C.bg)
  doc.rect(M, y, W, barH).strokeColor(C.border).lineWidth(0.5).stroke()

  items.forEach(([label, value], i) => {
    const x = M + i * colW

    if (i > 0) {
      doc.strokeColor(C.border).lineWidth(0.5)
         .moveTo(x, y + 8).lineTo(x, y + barH - 8).stroke()
    }

    doc.font('Helvetica-Bold').fontSize(7.5).fillColor(C.muted)
       .text(label.toUpperCase(), x + 12, y + 9, { width: colW - 16, lineBreak: false, characterSpacing: 0.3 })
    doc.font('Helvetica-Bold').fontSize(10).fillColor(C.inkMid)
       .text(fmt.str(value), x + 12, y + 22, { width: colW - 16, lineBreak: false })
  })

  doc.y = y + barH + 8
}

// ─────────────────────────────────────────────
//  Status Pill(s)
// ─────────────────────────────────────────────

const drawPills = (doc, status, isUrgent) => {
  const pills = []
  if (status)   pills.push({ text: status.toUpperCase(),  bg: statusColor(status) })
  if (isUrgent) pills.push({ text: 'URGENT',              bg: C.urgent })

  if (!pills.length) return

  const y = doc.y
  let   x = M

  pills.forEach(({ text, bg }) => {
    const pH = 6
    const pV = 3
    const w  = doc.widthOfString(text, { fontSize: 8 }) + pH * 2
    const h  = 17

    doc.roundedRect(x, y, w, h, 8).fill(bg)
    doc.font('Helvetica-Bold').fontSize(8).fillColor(C.white)
       .text(text, x + pH, y + pV + 1, { lineBreak: false })

    x += w + 6
  })

  doc.y = y + 24
}

// ─────────────────────────────────────────────
//  Prescription Item Card
// ─────────────────────────────────────────────

const drawItemCard = (doc, item, index, total) => {
  guard(doc, 140)

  const W      = cw(doc)
  const startY = doc.y
  const innerX = M + 14

  // ── Card header bar ──
  doc.rect(M, startY, W, 22).fill(C.inkMid)

  // Index badge
  doc.roundedRect(M + 8, startY + 4, 24, 14, 2).fill(C.teal)
  doc.font('Helvetica-Bold').fontSize(8).fillColor(C.white)
     .text(String(index + 1).padStart(2, '0'), M + 8, startY + 7, { width: 24, align: 'center', lineBreak: false })

  // Medicine name
  const medName = item.medicineId?.name || item.medicineId?.genericName || item.atcCode || 'Unknown Medicine'
  doc.font('Helvetica-Bold').fontSize(10).fillColor(C.white)
     .text(medName, M + 40, startY + 7, { width: W - 100, lineBreak: false })

  // Item counter
  doc.font('Helvetica').fontSize(7.5).fillColor('#64748b')
     .text(`${index + 1} of ${total}`, M + W - 56, startY + 8, { width: 50, align: 'right', lineBreak: false })

  doc.y = startY + 30

  // ── Two-column field grid ──
  const half    = Math.floor(W / 2) - 4
  const labelW  = 72
  const valW    = half - labelW - 8
  const colR    = M + Math.floor(W / 2) + 4
  const gridTop = doc.y

  const left  = [
    ['ATC Code',  fmt.str(item.atcCode)],
    ['Dose',      fmt.str(item.dose)],
    ['Frequency', fmt.str(item.frequency)],
  ]
  const right = [
    ['Route',     fmt.str(item.route)],
    ['Duration',  item.durationDays ? `${item.durationDays} day(s)` : 'N/A'],
    ['',          ''],
  ]

  const rowH2 = ROW_H + 2
  const rows  = Math.max(left.length, right.length)

  for (let r = 0; r < rows; r++) {
    const ry = gridTop + r * rowH2

    if (left[r] && left[r][0]) {
      doc.font('Helvetica-Bold').fontSize(8.5).fillColor(C.muted)
         .text(left[r][0], innerX, ry, { width: labelW, lineBreak: false })
      doc.font('Helvetica').fontSize(9).fillColor(C.slate)
         .text(left[r][1], innerX + labelW + 4, ry, { width: valW, lineBreak: false })
    }

    if (right[r] && right[r][0]) {
      doc.font('Helvetica-Bold').fontSize(8.5).fillColor(C.muted)
         .text(right[r][0], colR, ry, { width: labelW, lineBreak: false })
      doc.font('Helvetica').fontSize(9).fillColor(C.slate)
         .text(right[r][1], colR + labelW + 4, ry, { width: valW, lineBreak: false })
    }
  }

  // Vertical column separator
  const sepX = M + Math.floor(W / 2)
  doc.strokeColor(C.borderLight).lineWidth(0.5)
     .moveTo(sepX, gridTop - 4).lineTo(sepX, gridTop + rows * rowH2).stroke()

  doc.y = gridTop + rows * rowH2 + 4

  // ── Instructions — full width ──
  if (item.instructions) {
    divider(doc)
    doc.font('Helvetica-Bold').fontSize(8.5).fillColor(C.muted)
       .text('Instructions', innerX, doc.y, { width: 80, lineBreak: false })
    doc.font('Helvetica').fontSize(9).fillColor(C.slate)
       .text(fmt.str(item.instructions), innerX + 84, doc.y - 11, {
         width: W - 84 - 14,
         lineBreak: true,
       })
    doc.moveDown(0.2)
  }

  const endY  = doc.y + 10
  const cardH = endY - startY

  // Card border
  doc.rect(M, startY, W, cardH).strokeColor(C.border).lineWidth(0.8).stroke()

  doc.y = endY + 10
}

// ─────────────────────────────────────────────
//  Buffer
// ─────────────────────────────────────────────

const buildBuffer = (render, finalize) =>
  new Promise((resolve, reject) => {
    const doc    = new PDFDocument({ margin: M, size: 'A4', autoFirstPage: true, bufferPages: true })
    const chunks = []

    doc.on('data',  (c) => chunks.push(c))
    doc.on('end',   () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)

    render(doc)
    if (typeof finalize === 'function') finalize(doc)
    doc.end()
  })

// ─────────────────────────────────────────────
//  Main Export
// ─────────────────────────────────────────────

export const generatePrescriptionPdf = async (prescriptionId, actor) => {
  const prescription = await getPrescriptionById(prescriptionId, actor)
  if (!prescription) throw notFoundError()

  const patient     = prescription.patientId || {}
  const patientUser = patient.userId || null
  const clientUrl   = String(process.env.CLIENT_URL || '').replace(/\/+$/, '')
  const portalUrl   = clientUrl ? `${clientUrl}/patient/access` : '/patient/access'

  return buildBuffer(
    (doc) => {
      let pageNum = 1
      doc.on('pageAdded', () => {
        pageNum += 1
        drawHeader(doc, { compact: true, page: pageNum })
      })

      // ── Header ──
      drawHeader(doc, { compact: false, page: 1 })

      // ── Prescription Info ──
      drawSection(doc, 'Prescription Information')
      drawMetaBar(doc, [
        ['Rx ID',    prescription.rxId],
        ['Status',   prescription.status  || 'N/A'],
        ['Priority', prescription.isUrgent ? 'Urgent' : 'Standard'],
        ['Created',  fmt.date(prescription.createdAt)],
      ])
      drawPills(doc, prescription.status, prescription.isUrgent)

      // ── Doctor ──
      drawSection(doc, 'Prescribing Doctor')
      const doctorName = [prescription.doctorId?.firstName, prescription.doctorId?.lastName]
        .filter(Boolean).join(' ') || 'N/A'
      kv(doc, 'Name',  `Dr. ${doctorName}`, { bold: true })
      kv(doc, 'Email', prescription.doctorId?.email)

      // ── Patient ──
      drawSection(doc, 'Patient Information')
      kv(doc, 'Full Name',     patient.name, { bold: true })
      kv(doc, 'Patient ID',    patient.patientId)
      kv(doc, 'Date of Birth', fmt.date(patient.dob))
      kv(doc, 'Gender',        patient.gender)
      kv(doc, 'Weight',        patient.weight != null ? `${patient.weight} kg` : null)
      divider(doc)
      const allergies = fmt.list(
        (patient.allergies || []).map((a) => `${a.substance}${a.severity ? ` (${a.severity})` : ''}`)
      )
      kv(doc, 'Allergies',      allergies.join('  •  '))
      kv(doc, 'Medical History', fmt.list(patient.medicalHistory).join('  •  '))

      // ── Portal Access ──
      drawSection(doc, 'Patient Portal Access')
      kv(doc, 'Login URL',          portalUrl, { color: C.teal })
      kv(doc, 'Portal Email',        patientUser?.email)
      kv(doc, 'Temporary Password',  patientUser ? 'Provided in account invite email' : 'N/A')
      kv(doc, 'Last Login',          patientUser?.lastLogin ? fmt.datetime(patientUser.lastLogin) : 'First time login pending')

      // ── Clinical ──
      drawSection(doc, 'Clinical Details')
      kv(doc, 'Diagnosis',         prescription.diagnosis, { bold: true })
      kv(doc, 'Digital Signature', prescription.digitalSignature)

      // ── Items ──
      drawSection(doc, `Prescribed Medications  (${prescription.items.length} item${prescription.items.length !== 1 ? 's' : ''})`)
      doc.moveDown(0.3)

      prescription.items.forEach((item, i) => {
        drawItemCard(doc, item, i, prescription.items.length)
      })

      // ── Notes ──
      drawSection(doc, 'Important Notes')
      doc.moveDown(0.2)
      const notes = [
        'Patient portal access link is included above for first-time login.',
        'Temporary password is delivered through the invite email and must be changed after first login.',
        'This document is auto-generated by PIMS and is only valid when accompanied by a verified digital signature.',
        'For queries, contact the prescribing doctor or the pharmacy team directly.',
      ]
      notes.forEach((note) => {
        guard(doc, 20)
        doc.font('Helvetica').fontSize(8.5).fillColor(C.muted)
           .text(`•   ${note}`, M + 8, doc.y, { width: cw(doc) - 8, lineBreak: true, lineGap: 1 })
        doc.moveDown(0.3)
      })
    },

    // ── Footer on every page ──
    (doc) => {
      const { count } = doc.bufferedPageRange()
      for (let i = 0; i < count; i++) {
        doc.switchToPage(i)
        drawFooter(doc, prescription.rxId, i + 1, count)
      }
    }
  )
}