import mongoose, { Schema, model, models } from 'mongoose';

const AddressSchema = new Schema({
  fullName: { type: String, required: true },
  addressLine1: { type: String, required: true },
  addressLine2: { type: String, default: '' },
  city: { type: String, required: true },
  postalCode: { type: String, required: true },
  country: { type: String, required: true },
  isDefault: { type: Boolean, default: false },
}, { _id: true });

const UserSchema = new Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String },
  role: { type: String, enum: ['user', 'admin'], default: 'user' },
  status: { type: String, enum: ['active', 'suspended'], default: 'active' },
  oauthProvider: { type: String, enum: ['google'] },
  oauthId: { type: String },
  marketingOptOut: { type: Boolean, default: false },
  resetToken: { type: String },
  resetTokenExpiry: { type: Date },
  addresses: { type: [AddressSchema], default: [] },
  createdAt: { type: Date, default: Date.now },
  mobileNumber: { type: String, unique: true, sparse: true },
  otpHash: { type: String },
  otpExpiry: { type: Date },
  otpAttempts: { type: Number, default: 0 },
  otpLastSentAt: { type: Date },
});

const UserModel = models.User || model('User', UserSchema);
export default UserModel;
