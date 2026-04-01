import mongoose, { Schema, model, models } from 'mongoose';

const DiscountCodeSchema = new Schema({
    code: { type: String, required: true, unique: true }, // stored uppercase
    type: { type: String, enum: ['percentage', 'fixed'], required: true },
    value: { type: Number, required: true }, // percent (0-100) or cents
    expiresAt: { type: Date },
    usageLimit: { type: Number },
    usageCount: { type: Number, default: 0 },
    active: { type: Boolean, default: true },
});

const DiscountCodeModel = models.DiscountCode || model('DiscountCode', DiscountCodeSchema);
export default DiscountCodeModel;
