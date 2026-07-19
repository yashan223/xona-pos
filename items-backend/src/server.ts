import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { ProductModel } from './models/Product.js';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  console.error('MONGO_URI is missing in .env');
  process.exit(1);
}

const sampleItems = [
  {
    _id: 'seed_item_1',
    name: 'Wireless Mouse',
    sku: 'MS-WLS-001',
    category: 'Electronics',
    price: 1500,
    cost: 800,
    stock: 50,
    description: 'Ergonomic wireless mouse',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    _id: 'seed_item_2',
    name: 'Mechanical Keyboard',
    sku: 'KB-MCH-002',
    category: 'Electronics',
    price: 4500,
    cost: 2500,
    stock: 30,
    description: 'RGB mechanical keyboard with blue switches',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    _id: 'seed_item_3',
    name: 'USB-C Hub',
    sku: 'HB-USBC-003',
    category: 'Accessories',
    price: 2500,
    cost: 1200,
    stock: 100,
    description: '7-in-1 USB-C Hub adapter',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
];

async function seedDatabase() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGO_URI!);
    console.log('Connected to MongoDB successfully.');

    console.log('Clearing existing product data...');
    // Be careful, this deletes all existing products. Assuming this is a seed-only DB script.
    // If you only want to insert without deleting, comment the next line out.
    // await ProductModel.deleteMany({}); 

    console.log('Inserting sample items...');
    for (const item of sampleItems) {
      await ProductModel.findOneAndUpdate({ sku: item.sku }, item, { upsert: true, new: true });
    }
    
    console.log('Seed completed successfully!');
    
    // Automatically shut down the process after seeding is done
    console.log('Shutting down server automatically...');
    await mongoose.disconnect();
    process.exit(0);

  } catch (error) {
    console.error('An error occurred during seeding:', error);
    process.exit(1);
  }
}

seedDatabase();
