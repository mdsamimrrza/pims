import mongoose from 'mongoose'

const allergySchema = new mongoose.Schema(
  {
    substance: {
      type: String,
      required: true,
      trim: true,
    },
    severity: {
      type: String,
      enum: ['Severe', 'Moderate', 'Mild'],
      default: 'Mild',
    },
  },
  { _id: false }
)

const patientSchema = new mongoose.Schema(
  {
    patientId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    dob: {
      type: Date,
      required: true,
    },
    gender: {
      type: String,
      enum: ['Male', 'Female', 'Other'],
      default: 'Other',
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      unique: true,
      sparse: true,
    },
    weight: {
      type: Number,
      min: 0,
      default: null,
    },
    allergies: {
      type: [allergySchema],
      default: [],
    },
    medicalHistory: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true,
  }
)

patientSchema.index({ name: 'text', patientId: 1 })

patientSchema.set('toJSON', {
  transform: (_doc, ret) => {
    delete ret.__v
    return ret
  },
})

const Patient = mongoose.models.Patient || mongoose.model('Patient', patientSchema)

export default Patient
