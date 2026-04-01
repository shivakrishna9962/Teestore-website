import mongoose, { Schema, model, models } from 'mongoose';

const WishlistSchema = new Schema({
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    products: [{ type: Schema.Types.ObjectId, ref: 'Product' }],
    updatedAt: { type: Date, default: Date.now },
});

const WishlistModel = models.Wishlist || model('Wishlist', WishlistSchema);
export default WishlistModel;
