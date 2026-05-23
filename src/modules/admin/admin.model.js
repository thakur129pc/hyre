import mongoose from 'mongoose';

const adminSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true, select: false }, // Do not return password by default
  phone: { type: String, unique: true, sparse: true },
  role: {
    type: String,
    enum: ['super_admin', 'finance', 'support', 'city_manager'],
    required: true
  },
  assignedCityIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'CityMaster' }],
  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active'
  }
}, {
  timestamps: true
});

// Index for filtering admins by role and status
adminSchema.index({ role: 1, status: 1 });

const Admin = mongoose.model('Admin', adminSchema);

export default Admin;
