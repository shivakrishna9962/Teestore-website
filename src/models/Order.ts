import mongoose, { Schema, model, models } from 'mongoose';

const OrderItemSchema = new Schema(
  {
    product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    title: { type: String, required: true }, // snapshot
    size: { type: String, required: true },
    color: { type: String, required: true },
    quantity: { type: Number, required: true },
    unitPrice: { type: Number, required: true }, // snapshot in cents
  },
  { _id: false }
);

const AddressSchema = new Schema(
  {
    fullName: { type: String, required: true },
    addressLine1: { type: String, required: true },
    addressLine2: { type: String },
    city: { type: String, required: true },
    postalCode: { type: String, required: true },
    country: { type: String, required: true },
  },
  { _id: false }
);

const StatusEventSchema = new Schema(
  {
    status: { type: String, required: true },
    timestamp: { type: Date, required: true, default: Date.now },
    adminId: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { _id: false }
);

const OrderSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    items: [OrderItemSchema],
    shippingAddress: { type: AddressSchema, required: true },
    deliveryMethod: { type: String, required: true },
    subtotal: { type: Number, required: true },   // in cents
    taxes: { type: Number, required: true },       // in cents
    shippingCost: { type: Number, required: true }, // in cents
    discountAmount: { type: Number, default: 0 },  // in cents
    total: { type: Number, required: true },        // in cents
    paymentIntentId: { type: String, required: true }, // Stripe
    status: {
      type: String,
      enum: ['Confirmed', 'Processing', 'Shipped', 'Out for Delivery', 'Delivered'],
      default: 'Confirmed',
    },
    statusHistory: [StatusEventSchema],
    trackingNumber: { type: String },
    carrier: { type: String },
    invoiceId: { type: Schema.Types.ObjectId, ref: 'Invoice' },
  },
  { timestamps: true }
);

const OrderModel = models.Order || model('Order', OrderSchema);
export default OrderModel;
