import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import User from '../src/models/User.model.js';
import Patient from '../src/models/Patient.model.js';
import Medicine from '../src/models/Medicine.model.js';
import ATCCode from '../src/models/ATCCode.model.js';
import Inventory from '../src/models/Inventory.model.js';
import Alert from '../src/models/Alert.model.js';
import { hashPassword } from '../src/utils/password.js';
import atcSeedDocs from '../src/data/atc.seed.js';
import medicineSeedDocs from '../src/data/medicine.seed.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/pims';

async function seed() {
  console.log('🚀 Starting Master Seed Process...');

  try {
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB');

    // 1. Seed Users
    console.log('👤 Seeding Users...');
    const commonPasswordHash = await hashPassword('password123');
    
    const users = [
      { firstName: 'Admin', lastName: 'User', email: 'admin@pims.com', role: 'ADMIN', passwordHash: commonPasswordHash },
      { firstName: 'Doctor', lastName: 'Smith', email: 'doctor@pims.com', role: 'DOCTOR', passwordHash: commonPasswordHash },
      { firstName: 'Lena', lastName: 'Brooks', email: 'pharma@pims.com', role: 'PHARMACIST', passwordHash: commonPasswordHash },
      { firstName: 'John', lastName: 'Doe', email: 'john.doe@example.com', role: 'PATIENT', passwordHash: commonPasswordHash },
    ];

    for (const u of users) {
      await User.findOneAndUpdate({ email: u.email }, u, { upsert: true, new: true });
    }
    console.log('✅ Users seeded');

    // 2. Seed ATC Codes
    console.log('🏷️ Seeding ATC Codes...');
    for (const atc of atcSeedDocs) {
      await ATCCode.findOneAndUpdate({ code: atc.code }, atc, { upsert: true });
    }
    console.log('✅ ATC Codes seeded');

    // 3. Seed Medicines
    console.log('💊 Seeding Medicines...');
    const savedMedicines = [];
    for (const med of medicineSeedDocs) {
      const saved = await Medicine.findOneAndUpdate({ atcCode: med.atcCode, name: med.name }, med, { upsert: true, new: true });
      savedMedicines.push(saved);
    }
    console.log('✅ Medicines seeded');

    // 4. Seed Patients (from mockData.js)
    console.log('👨‍👩‍👧‍👦 Seeding Patients...');
    const patientsData = [
      { patientId: 'P-123456', name: 'John Doe', dob: '1986-02-14', gender: 'Male', allergies: [{ substance: 'Penicillin', severity: 'Severe' }] },
      { patientId: 'P-782201', name: 'Jane Smith', dob: '1990-08-21', gender: 'Female', allergies: [{ substance: 'Ibuprofen', severity: 'Mild' }] },
      { patientId: 'P-600197', name: 'Robert Henderson', dob: '1982-05-14', gender: 'Male', allergies: [{ substance: 'Penicillin', severity: 'Moderate' }] },
      { patientId: 'P-410900', name: 'Emily Davis', dob: '1979-11-30', gender: 'Female', allergies: [] }
    ];
    for (const p of patientsData) {
      await Patient.findOneAndUpdate({ patientId: p.patientId }, p, { upsert: true });
    }
    console.log('✅ Patients seeded');

    // 5. Seed Inventory
    console.log('📦 Seeding Inventory...');
    // Create inventory for a few medicines
    const inventoryData = [
      { medicineName: 'Metformin 500', stock: 340, threshold: 120, batchId: 'B-2291', expiryDate: '2026-11-18' },
      { medicineName: 'Amoxicillin 500', stock: 18, threshold: 60, batchId: 'B-1160', expiryDate: '2026-06-05' },
      { medicineName: 'Lisinopril 10', stock: 77, threshold: 50, batchId: 'B-1092', expiryDate: '2026-08-11' },
      { medicineName: 'Insulin Glargine 100IU', stock: 24, threshold: 20, batchId: 'C-3401', expiryDate: '2026-05-12' },
      { medicineName: 'Atorvastatin 20', stock: 128, threshold: 70, batchId: 'A-1887', expiryDate: '2027-01-28' }
    ];

    for (const inv of inventoryData) {
      const med = savedMedicines.find(m => m.name === inv.medicineName);
      if (med) {
        await Inventory.findOneAndUpdate(
          { batchId: inv.batchId },
          {
            medicineId: med._id,
            stock: inv.stock,
            threshold: inv.threshold,
            batchId: inv.batchId,
            expiryDate: new Date(inv.expiryDate),
            location: 'Main Pharmacy Shelf'
          },
          { upsert: true }
        );
      }
    }
    console.log('✅ Inventory seeded');

    // 6. Seed Alerts
    console.log('🔔 Seeding Alerts...');
    const alertsData = [
      { type: 'LOW_STOCK', severity: 'CRITICAL', message: 'Amoxicillin 500mg: 18 units remaining' },
      { type: 'NEAR_EXPIRY', severity: 'WARNING', message: 'Insulin Glargine: 22 days until expiry' }
    ];
    for (const a of alertsData) {
      await Alert.findOneAndUpdate({ message: a.message }, a, { upsert: true });
    }
    console.log('✅ Alerts seeded');

    console.log('✨ Master Seed Completed Successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding Failed:', error);
    process.exit(1);
  }
}

seed();
