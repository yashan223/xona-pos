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
    name: 'Wireless Ergonomic Mouse',
    sku: 'MS-WLS-001',
    category: 'Electronics',
    price: 1500,
    cost: 800,
    stock: 50,
    description: 'Ergonomic wireless mouse with 2.4GHz USB receiver',
    imageUrl: 'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=400&q=80',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    _id: 'seed_item_2',
    name: 'RGB Mechanical Keyboard',
    sku: 'KB-MCH-002',
    category: 'Electronics',
    price: 4500,
    cost: 2500,
    stock: 30,
    description: 'RGB mechanical keyboard with blue tactile switches',
    imageUrl: 'https://images.unsplash.com/photo-1595225476474-87563907a212?w=400&q=80',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    _id: 'seed_item_3',
    name: '7-in-1 USB-C Hub',
    sku: 'HB-USBC-003',
    category: 'Accessories',
    price: 2500,
    cost: 1200,
    stock: 100,
    description: 'Multi-port USB-C Hub adapter for Mac and PC',
    imageUrl: 'https://images.unsplash.com/photo-1574269909862-7e1d70bb8078?w=400&q=80',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    _id: 'seed_item_4',
    name: '4K Ultra HD Monitor',
    sku: 'MN-4K-004',
    category: 'Electronics',
    price: 32000,
    cost: 25000,
    stock: 15,
    description: '27-inch 4K UHD IPS Monitor with HDR10',
    imageUrl: 'https://images.unsplash.com/photo-1527443195645-1133f7f28990?w=400&q=80',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    _id: 'seed_item_5',
    name: 'Pro Gaming Headset',
    sku: 'HD-GM-005',
    category: 'Accessories',
    price: 5500,
    cost: 3200,
    stock: 45,
    description: 'Surround sound gaming headset with noise-canceling mic',
    imageUrl: 'https://images.unsplash.com/photo-1618366712010-f4ae9c647dcb?w=400&q=80',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    _id: 'seed_item_6',
    name: 'HD Web Camera 1080p',
    sku: 'CM-HD-006',
    category: 'Electronics',
    price: 2800,
    cost: 1500,
    stock: 60,
    description: '1080p HD webcam with built-in microphone for streaming',
    imageUrl: 'https://images.unsplash.com/photo-1599813204780-327c4fb62cde?w=400&q=80',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    _id: 'seed_item_7',
    name: 'External SSD 1TB',
    sku: 'SD-1TB-007',
    category: 'Storage',
    price: 12000,
    cost: 8500,
    stock: 25,
    description: 'Portable NVMe SSD 1TB with USB 3.2 Gen 2',
    imageUrl: 'https://images.unsplash.com/photo-1606830573934-8b6b1fcfaee6?w=400&q=80',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    _id: 'seed_item_8',
    name: 'Ergonomic Office Chair',
    sku: 'FR-CH-008',
    category: 'Furniture',
    price: 18500,
    cost: 11000,
    stock: 10,
    description: 'Breathable mesh ergonomic office chair with lumbar support',
    imageUrl: 'https://images.unsplash.com/photo-1505843490538-5133c6c7d0e1?w=400&q=80',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    _id: 'seed_item_9',
    name: 'Adjustable Standing Desk',
    sku: 'FR-DSK-009',
    category: 'Furniture',
    price: 45000,
    cost: 32000,
    stock: 5,
    description: 'Motorized height adjustable standing desk with memory presets',
    imageUrl: 'https://images.unsplash.com/photo-1593062096033-9a26b09da705?w=400&q=80',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    _id: 'seed_item_10',
    name: 'Portable Bluetooth Speaker',
    sku: 'SP-BT-010',
    category: 'Electronics',
    price: 3500,
    cost: 1800,
    stock: 80,
    description: 'Waterproof portable bluetooth speaker with 12h battery life',
    imageUrl: 'https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=400&q=80',
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
    await ProductModel.deleteMany({}); 

    console.log('Inserting sample items...');
    for (const item of sampleItems) {
      await ProductModel.findOneAndUpdate({ sku: item.sku }, item, { upsert: true, new: true });
    }
    
    console.log('Seed completed successfully!');
    
    // Automatically shut down the server after seeding is done
    console.log('Shutting down server automatically...');
    await mongoose.disconnect();
    process.exit(0);

  } catch (error) {
    console.error('An error occurred during seeding:', error);
    process.exit(1);
  }
}

seedDatabase();
