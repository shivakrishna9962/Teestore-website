import mongoose, { Schema, model, models } from 'mongoose';

const InventorySchema = new Schema({
    product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    size: { type: String, required: true },
    color: { type: String, required: true },
    stock: { type: Number, required: true, default: 0, min: 0 },
    lowStockThreshold: { type: Number, default: 5 },
    updatedAt: { type: Date, default: Date.now },
});

InventorySchema.index({ product: 1, size: 1, color: 1 }, { unique: true });

const InventoryModel = models.Inventory || model('Inventory', InventorySchema);
export default InventoryModel;
