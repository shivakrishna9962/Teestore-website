import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '../.env') });

const uri = process.env.MONGODB_URI;
console.log('Connecting to:', uri?.substring(0, 30) + '...');

const ProductSchema = new mongoose.Schema({
    title: String,
    description: String,
    price: Number,
    images: [String],
    category: String,
    sizes: [String],
    colors: [String],
    featured: Boolean,
    active: Boolean,
}, { timestamps: true });

const Product = mongoose.models.Product || mongoose.model('Product', ProductSchema);

const SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];

const products = [
    {
        title: 'Classic Black Tee',
        description: 'A timeless black t-shirt made from 100% premium cotton. Perfect for any occasion.',
        price: 2999,
        images: ['/images/products/black_tshirt.jpg'],
        category: 'Classic',
        sizes: SIZES,
        colors: ['Black'],
        featured: true,
        active: true,
    },
    {
        title: 'Ocean Blue Tee',
        description: 'A fresh ocean blue t-shirt with a relaxed fit. Great for casual wear.',
        price: 2999,
        images: ['/images/products/blue_tshirt.jpg'],
        category: 'Casual',
        sizes: SIZES,
        colors: ['Blue'],
        featured: true,
        active: true,
    },
    {
        title: 'Clean White Tee',
        description: 'A crisp white t-shirt that pairs with everything. A wardrobe essential.',
        price: 2499,
        images: ['/images/products/white_tshirt.jpg'],
        category: 'Classic',
        sizes: SIZES,
        colors: ['White'],
        featured: false,
        active: true,
    },
    {
        title: 'TeeStore Collection Pack',
        description: 'Our signature collection featuring multiple styles. A must-have for tee lovers.',
        price: 7999,
        images: ['/images/products/three_tshirts.jpg'],
        category: 'Collection',
        sizes: ['S', 'M', 'L', 'XL'],
        colors: ['Black', 'White', 'Blue'],
        featured: true,
        active: true,
    },
    {
        title: 'Urban Street Tee',
        description: 'Bold street-style tee for the modern urban look.',
        price: 3199,
        images: ['/images/products/image_1.jpg'],
        category: 'Street',
        sizes: SIZES,
        colors: ['Black'],
        featured: false,
        active: true,
    },
    {
        title: 'Vintage Graphic Tee',
        description: 'Retro-inspired graphic tee with a worn-in feel.',
        price: 3499,
        images: ['/images/products/image_2.jpg'],
        category: 'Graphic',
        sizes: SIZES,
        colors: ['Grey'],
        featured: true,
        active: true,
    },
    {
        title: 'Minimalist Tee',
        description: 'Clean lines, no fuss. The perfect minimalist everyday tee.',
        price: 2799,
        images: ['/images/products/image_3.jpg'],
        category: 'Minimalist',
        sizes: SIZES,
        colors: ['White'],
        featured: false,
        active: true,
    },
    {
        title: 'Summer Vibes Tee',
        description: 'Light and breezy tee perfect for warm summer days.',
        price: 2599,
        images: ['/images/products/image_4.jpg'],
        category: 'Casual',
        sizes: SIZES,
        colors: ['Yellow'],
        featured: false,
        active: true,
    },
    {
        title: 'Bold Print Tee',
        description: 'Make a statement with this eye-catching bold print design.',
        price: 3299,
        images: ['/images/products/image_5.jpg'],
        category: 'Graphic',
        sizes: SIZES,
        colors: ['Red'],
        featured: true,
        active: true,
    },
    {
        title: 'Essential Grey Tee',
        description: 'A versatile grey tee that works with any outfit.',
        price: 2499,
        images: ['/images/products/image_6.jpg'],
        category: 'Classic',
        sizes: SIZES,
        colors: ['Grey'],
        featured: false,
        active: true,
    },
    {
        title: 'Premium Fitted Tee',
        description: 'Slim-fit premium tee for a sharp, tailored look.',
        price: 3999,
        images: ['/images/products/image_7.jpg'],
        category: 'Premium',
        sizes: SIZES,
        colors: ['Navy'],
        featured: true,
        active: true,
    },
    {
        title: 'Oversized Comfort Tee',
        description: 'Relaxed oversized fit for maximum comfort and style.',
        price: 3299,
        images: ['/images/products/image_8.jpg'],
        category: 'Casual',
        sizes: SIZES,
        colors: ['Beige'],
        featured: false,
        active: true,
    },
    {
        title: 'Limited Edition Drop',
        description: 'Exclusive limited edition design. Get it before it\'s gone.',
        price: 4999,
        images: ['/images/products/image_9.jpg'],
        category: 'Limited',
        sizes: ['S', 'M', 'L', 'XL'],
        colors: ['Black'],
        featured: true,
        active: true,
    },
];

async function seed() {
    try {
        await mongoose.connect(uri);
        console.log('Connected to MongoDB');

        await Product.deleteMany({});
        console.log('Cleared existing products');

        const inserted = await Product.insertMany(products);
        console.log(`Seeded ${inserted.length} products:`);
        inserted.forEach(p => console.log(' -', p.title));

        await mongoose.disconnect();
        console.log('Done!');
    } catch (err) {
        console.error('Seed error:', err.message);
        process.exit(1);
    }
}

seed();
