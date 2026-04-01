import mongoose, { Schema, model, models } from 'mongoose';

const CartItemSchema = new Schema(
    {
        product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
        size: { type: String, required: true },
        color: { type: String, required: true },
        quantity: { type: Number, required: true, min: 1 },
        unitPrice: { type: Number, required: true }, // snapshot in cents
    },
    { _id: true }
);

const CartSchema = new Schema({
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    items: [CartItemSchema],
    discountCode: { type: String },
    discountAmount: { type: Number, default: 0 }, // in cents
    updatedAt: { type: Date, default: Date.now },
});

const CartModel = models.Cart || model('Cart', CartSchema);
export default CartModel;
