import mongoose from 'mongoose'

const prescriptionItemSchema = new mongoose.Schema(
  {
    medicineId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Medicine',
      default: null,
    },
    atcCode: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },
    dose: {
      type: String,
      required: true,
      trim: true,
    },
    quantity: {
      type: Number,
      min: 1,
      default: 1,
    },
    frequency: {
      type: String,
      required: true,
      trim: true,
    },
    route: {
      type: String,
      default: 'Oral',
      trim: true,
    },
    durationDays: {
      type: Number,
      min: 1,
      default: 1,
    },
    instructions: {
      type: String,
      default: '',
      trim: true,
    },
  },
  { _id: false }
)

const prescriptionSchema = new mongoose.Schema(
  {
    rxId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Patient',
      required: true,
    },
    doctorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    diagnosis: {
      type: String,
      default: '',
      trim: true,
    },
    items: {
      type: [prescriptionItemSchema],
      default: [],
    },
    status: {
      type: String,
      enum: ['Draft', 'Pending', 'Processing', 'Filled', 'Cancelled'],
      default: 'Pending',
    },
    isUrgent: {
      type: Boolean,
      default: false,
    },
    allowRefills: {
      type: Number,
      min: 0,
      max: 3,
      default: 0,
    },
    digitalSignature: {
      type: String,
      default: '',
      trim: true,
    },
    pdfUrl: {
      type: String,
      default: '',
      trim: true,
    },
  },
  {
    timestamps: true,
  }
)

prescriptionSchema.index({ doctorId: 1, createdAt: -1 })
prescriptionSchema.index({ patientId: 1, createdAt: -1 })
prescriptionSchema.index({ status: 1, createdAt: -1 })

prescriptionSchema.set('toJSON', {
  transform: (_doc, ret) => {
    delete ret.__v
    return ret
  },
})

const Prescription = mongoose.models.Prescription || mongoose.model('Prescription', prescriptionSchema)

export default Prescription
