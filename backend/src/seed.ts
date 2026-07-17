import 'dotenv/config';
import mongoose from 'mongoose';
import { UserModel, ProductModel, CustomerModel, TransactionModel, GraphNodeModel, GraphEdgeModel } from './persistence/database.js';
import { hashPassword } from './lib/crypto.js';
import store from './persistence/store.js';

// Setup connection check for direct script run
const isDirectRun = process.argv[1]?.endsWith('seed.ts') || process.argv[1]?.endsWith('seed.js');

const MOCK_PRODUCTS = [
  { id: 'p-ipad', name: 'iPad Air 256GB', sku: 'SKU-E-IPAD', category: 'Electronics', price: 599.99, cost: 420.00, stock: 12, description: 'Apple iPad Air 10.9-inch with M1 chip.', imageUrl: 'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=100' },
  { id: 'p-mouse', name: 'Wireless Ergonomic Mouse', sku: 'SKU-E-MOUSE', category: 'Electronics', price: 39.99, cost: 15.00, stock: 45, description: 'Rechargeable 2.4G optical mouse.', imageUrl: 'https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?w=100' },
  { id: 'p-kb', name: 'Mechanical Keyboard Blue Switch', sku: 'SKU-E-MECHKB', category: 'Electronics', price: 89.99, cost: 38.00, stock: 20, description: 'Retro RGB backlit clicky mechanical keyboard.', imageUrl: 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=100' },
  
  { id: 'p-beans', name: 'Espresso Roast Coffee Beans', sku: 'SKU-C-BEANS', category: 'Coffee & Beverages', price: 16.99, cost: 6.00, stock: 60, description: 'Organic fair-trade dark roast beans (1kg).', imageUrl: 'https://images.unsplash.com/photo-1447933601403-0c6688de566e?w=100' },
  { id: 'p-milk', name: 'Organic Oat Milk 1L', sku: 'SKU-C-OATMILK', category: 'Coffee & Beverages', price: 4.49, cost: 1.80, stock: 32, description: 'Barista edition creamy oat milk.', imageUrl: 'https://images.unsplash.com/photo-1563227812-0ea4c22e6cc8?w=100' },
  { id: 'p-syrup', name: 'Salted Caramel Syrup', sku: 'SKU-C-CARAMEL', category: 'Coffee & Beverages', price: 8.99, cost: 3.50, stock: 18, description: 'Sweet gourmet syrup for coffees and lattes.', imageUrl: 'https://images.unsplash.com/photo-1595981267035-7b04ca84a82d?w=100' },
  
  { id: 'p-journal', name: 'A5 Dotted Leather Journal', sku: 'SKU-S-JOURNAL', category: 'Stationery', price: 14.50, cost: 5.00, stock: 25, description: '160 pages fountain pen-friendly notebook.', imageUrl: 'https://images.unsplash.com/photo-1531346878377-a5be20888e57?w=100' },
  { id: 'p-pens', name: 'Fine Gel Ink Pens 5-Pack', sku: 'SKU-S-PENS', category: 'Stationery', price: 7.99, cost: 2.20, stock: 50, description: 'Quick-drying black gel ink pens 0.5mm.', imageUrl: 'https://images.unsplash.com/photo-1583485088034-697b5bc54ccd?w=100' },
];

const MOCK_CUSTOMERS = [
  { id: 'c-john', name: 'John Doe', phone: '555-0199', email: 'john.doe@gmail.com', loyaltyPoints: 45 },
  { id: 'c-jane', name: 'Jane Smith', phone: '555-0144', email: 'jane.smith@yahoo.com', loyaltyPoints: 120 },
  { id: 'c-bob', name: 'Bob Miller', phone: '555-0122', email: 'bob.miller@hotmail.com', loyaltyPoints: 15 },
];

const MOCK_CASHIERS = [
  { id: 'cashier-1', username: 'cashier1', password: 'cashier123', email: 'cashier1@xona-pos.dev', role: 'cashier' },
  { id: 'cashier-2', username: 'cashier2', password: 'cashier123', email: 'cashier2@xona-pos.dev', role: 'cashier' },
  { id: 'owner-1', username: 'owner', password: 'owner123', email: 'owner@xona-pos.dev', role: 'owner' },
];

// Helper to get past dates
function getPastDate(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString();
}

export async function runSeed(): Promise<void> {
  console.log('[Seed] Starting database seed...');

  try {
    // 1. Seed Cashiers
    for (const cashier of MOCK_CASHIERS) {
      await UserModel.findOneAndUpdate(
        { username: cashier.username },
        {
          _id: cashier.id,
          username: cashier.username,
          passwordHash: hashPassword(cashier.password),
          email: cashier.email,
          createdAt: new Date().toISOString(),
          role: cashier.role,
        },
        { upsert: true, new: true }
      );
    }
    console.log('[Seed] Seeded users/cashiers');

    // 2. Seed Products & Graph Nodes
    for (const prod of MOCK_PRODUCTS) {
      await ProductModel.findOneAndUpdate(
        { _id: prod.id },
        {
          _id: prod.id,
          name: prod.name,
          sku: prod.sku,
          category: prod.category,
          price: prod.price,
          cost: prod.cost,
          stock: prod.stock,
          description: prod.description,
          imageUrl: prod.imageUrl,
          salesCount: 0,
          createdAt: getPastDate(15),
          updatedAt: getPastDate(15),
        },
        { upsert: true }
      );

      // Create Product Graph Node
      await GraphNodeModel.findOneAndUpdate(
        { _id: prod.id },
        { type: 'product', label: prod.name },
        { upsert: true }
      );

      // Create Category Graph Node
      const categoryId = `cat:${prod.category.toLowerCase().replace(/\s+/g, '-')}`;
      await GraphNodeModel.findOneAndUpdate(
        { _id: categoryId },
        { type: 'category', label: prod.category },
        { upsert: true }
      );

      // Create product-to-category BELONGS_TO edge
      await GraphEdgeModel.findOneAndUpdate(
        { source: prod.id, target: categoryId, type: 'BELONGS_TO' },
        {},
        { upsert: true }
      );
    }
    console.log('[Seed] Seeded products catalog and category nodes');

    // 3. Seed Customers
    for (const cust of MOCK_CUSTOMERS) {
      await CustomerModel.findOneAndUpdate(
        { _id: cust.id },
        {
          _id: cust.id,
          name: cust.name,
          phone: cust.phone,
          email: cust.email,
          loyaltyPoints: cust.loyaltyPoints,
          createdAt: getPastDate(10),
        },
        { upsert: true }
      );
    }
    console.log('[Seed] Seeded loyalty customers');

    // 4. Seed Transaction Records (last 10 days of sales to construct visual graphs)
    const mockSales = [
      {
        cashierId: 'cashier-1',
        customerId: 'c-john',
        daysAgo: 9,
        items: [
          { productId: 'p-beans', quantity: 1 },
          { productId: 'p-milk', quantity: 2 }
        ],
        paymentMethod: 'cash',
      },
      {
        cashierId: 'cashier-1',
        customerId: 'c-jane',
        daysAgo: 8,
        items: [
          { productId: 'p-ipad', quantity: 1 },
          { productId: 'p-kb', quantity: 1 },
          { productId: 'p-mouse', quantity: 1 }
        ],
        paymentMethod: 'card',
      },
      {
        cashierId: 'cashier-2',
        customerId: null,
        daysAgo: 7,
        items: [
          { productId: 'p-beans', quantity: 2 },
          { productId: 'p-syrup', quantity: 1 },
          { productId: 'p-milk', quantity: 1 }
        ],
        paymentMethod: 'mobile',
      },
      {
        cashierId: 'cashier-1',
        customerId: 'c-bob',
        daysAgo: 6,
        items: [
          { productId: 'p-journal', quantity: 1 },
          { productId: 'p-pens', quantity: 2 }
        ],
        paymentMethod: 'cash',
      },
      {
        cashierId: 'cashier-2',
        customerId: 'c-jane',
        daysAgo: 5,
        items: [
          { productId: 'p-beans', quantity: 1 },
          { productId: 'p-milk', quantity: 1 }
        ],
        paymentMethod: 'card',
      },
      {
        cashierId: 'cashier-1',
        customerId: null,
        daysAgo: 4,
        items: [
          { productId: 'p-ipad', quantity: 1 },
          { productId: 'p-mouse', quantity: 1 }
        ],
        paymentMethod: 'card',
      },
      {
        cashierId: 'cashier-2',
        customerId: 'c-john',
        daysAgo: 3,
        items: [
          { productId: 'p-journal', quantity: 2 },
          { productId: 'p-pens', quantity: 1 }
        ],
        paymentMethod: 'cash',
      },
      {
        cashierId: 'cashier-1',
        customerId: null,
        daysAgo: 2,
        items: [
          { productId: 'p-beans', quantity: 1 },
          { productId: 'p-syrup', quantity: 1 },
          { productId: 'p-milk', quantity: 1 }
        ],
        paymentMethod: 'mobile',
      },
      {
        cashierId: 'cashier-2',
        customerId: 'c-jane',
        daysAgo: 1,
        items: [
          { productId: 'p-kb', quantity: 1 },
          { productId: 'p-mouse', quantity: 1 }
        ],
        paymentMethod: 'card',
      },
      {
        cashierId: 'cashier-1',
        customerId: 'c-john',
        daysAgo: 0,
        items: [
          { productId: 'p-beans', quantity: 1 },
          { productId: 'p-milk', quantity: 1 }
        ],
        paymentMethod: 'cash',
      }
    ];

    for (let index = 0; index < mockSales.length; index++) {
      const sale = mockSales[index];
      const txId = `tx-seed-${index}`;
      const saleDate = getPastDate(sale.daysAgo);

      // Compute items totals
      const itemsList = [];
      let subtotal = 0;

      for (const item of sale.items) {
        const prod = MOCK_PRODUCTS.find(p => p.id === item.productId)!;
        const lineTotal = prod.price * item.quantity;
        subtotal += lineTotal;
        itemsList.push({
          productId: item.productId,
          name: prod.name,
          price: prod.price,
          quantity: item.quantity,
          subtotal: lineTotal,
        });

        // Increment salesCount and deduct stock on products
        await ProductModel.updateOne(
          { _id: item.productId },
          { $inc: { salesCount: item.quantity, stock: -item.quantity } }
        );
      }

      const discount = 0;
      const tax = parseFloat((subtotal * 0.08).toFixed(2));
      const totalAmount = parseFloat((subtotal + tax).toFixed(2));

      await TransactionModel.create({
        _id: txId,
        cashierId: sale.cashierId,
        customerId: sale.customerId,
        items: itemsList,
        subtotal,
        discount,
        tax,
        totalAmount,
        paymentMethod: sale.paymentMethod as 'cash' | 'card' | 'mobile',
        paymentStatus: 'paid',
        createdAt: saleDate,
      });

      // Update customer loyalty points (1 point per $10 spent)
      if (sale.customerId) {
        const earnedPoints = Math.floor(totalAmount / 10);
        await CustomerModel.updateOne(
          { _id: sale.customerId },
          { $inc: { loyaltyPoints: earnedPoints } }
        );
      }

      // Add co-occurrence bought-together graph edges
      const prodIds = sale.items.map(i => i.productId);
      for (let i = 0; i < prodIds.length; i++) {
        for (let j = i + 1; j < prodIds.length; j++) {
          const source = prodIds[i];
          const target = prodIds[j];
          const [u, v] = [source, target].sort();

          const existingEdge = await GraphEdgeModel.findOne({ source: u, target: v, type: 'BOUGHT_WITH' });
          if (existingEdge) {
            const weight = ((existingEdge.toObject() as any).metadata?.weight || 1) + 1;
            await GraphEdgeModel.updateOne(
              { _id: (existingEdge as any)._id },
              { $set: { metadata: { weight } } }
            );
          } else {
            await GraphEdgeModel.create({
              source: u,
              target: v,
              type: 'BOUGHT_WITH',
              metadata: { weight: 1 }
            } as any);
          }
        }
      }
    }

    console.log(`[Seed] Seeded ${mockSales.length} transaction sales history logs`);
    console.log('[Seed] Database seed completed successfully!');

  } catch (err) {
    console.error('[Seed] Database seed error:', err);
    throw err;
  }
}

// Automatically run if executed directly
if (isDirectRun) {
  const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/xona-pos';
  console.log('[Seed] Connecting to MongoDB to run seed directly...');
  mongoose.connect(MONGO_URI)
    .then(async () => {
      // Clear first
      await UserModel.deleteMany({ username: { $ne: 'admin' } });
      await ProductModel.deleteMany({});
      await TransactionModel.deleteMany({});
      await CustomerModel.deleteMany({});
      await GraphNodeModel.deleteMany({});
      await GraphEdgeModel.deleteMany({});

      await runSeed();
      await mongoose.disconnect();
      console.log('[Seed] Disconnected from MongoDB.');
      process.exit(0);
    })
    .catch(err => {
      console.error('[Seed] Script connection error:', err);
      process.exit(1);
    });
}
