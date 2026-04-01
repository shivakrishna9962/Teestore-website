import mongoose, { Schema, model, models } from 'mongoose';

const ProductSchema = new Schema(
  {
    title: { type: String, required: true },
    description: { type: String, required: true },
    price: { type: Number, required: true }, // stored in cents
    images: [{ type: String, required: true }],
    category: { type: String, required: true },
    sizes: [{ type: String, required: true }],
    colors: [{ type: String }],
    featured: { type: Boolean, default: false },
    active: { type: Boolean, default: true }, // soft delete flag
  },
  { timestamps: true }
);

ProductSchema.index({ title: 'text', description: 'text', category: 'text' });

const ProductModel = models.Product || model('Product', ProductSchema);
export default ProductModel;
