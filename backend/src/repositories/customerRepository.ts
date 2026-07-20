import { CustomerModel } from '../persistence/database.js';
import db from '../persistence/sqliteDb.js';
import { isCloudOnline } from '../persistence/syncEngine.js';
import { CustomerRecord } from '../types/index.js';
class CustomerRepository {
  private _generateId(): string {
    return `cust-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }
  async addCustomer(customerData: Partial<CustomerRecord>): Promise<CustomerRecord> {
    const now = new Date().toISOString();
    const id = customerData.id || this._generateId();
    const record: CustomerRecord = {
      id,
      name: customerData.name || '',
      phone: customerData.phone || '',
      email: customerData.email || '',
      createdAt: now,
    };
    const online = isCloudOnline();
    db.prepare(`
      INSERT INTO local_customers (id, name, phone, email, synced, createdAt)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name,
        phone = excluded.phone,
        email = excluded.email,
        synced = excluded.synced
    `).run(
      record.id,
      record.name,
      record.phone,
      record.email,
      online ? 1 : 0,
      record.createdAt
    );
    if (online) {
      try {
        await CustomerModel.create({
          _id: record.id,
          name: record.name,
          phone: record.phone,
          email: record.email,
          createdAt: record.createdAt,
        });
      } catch (err) {
        console.error('[CustomerRepository] Error writing customer to Cloud MongoDB (saved locally):', err);
      }
    }
    return record;
  }
  async getAllCustomers(): Promise<CustomerRecord[]> {
    const rows = db.prepare('SELECT * FROM local_customers ORDER BY name ASC').all() as any[];
    if (rows.length > 0) {
      return rows.map(r => ({
        id: r.id,
        name: r.name,
        phone: r.phone || '',
        email: r.email || '',
        createdAt: r.createdAt,
      }));
    }
    if (isCloudOnline()) {
      const docs = await CustomerModel.find().sort({ name: 1 }).lean();
      return docs.map((doc: any) => this.docToCustomer(doc));
    }
    return [];
  }
  async getCustomerById(id: string): Promise<CustomerRecord | null> {
    const row = db.prepare('SELECT * FROM local_customers WHERE id = ?').get(id) as any;
    if (row) {
      return {
        id: row.id,
        name: row.name,
        phone: row.phone || '',
        email: row.email || '',
        createdAt: row.createdAt,
      };
    }
    if (isCloudOnline()) {
      const doc = await CustomerModel.findById(id).lean() as any;
      if (doc) return this.docToCustomer(doc);
    }
    return null;
  }
  async deleteCustomer(id: string): Promise<boolean> {
    db.prepare('DELETE FROM local_customers WHERE id = ?').run(id);
    if (isCloudOnline()) {
      try {
        await CustomerModel.deleteOne({ _id: id });
      } catch (err) {
        console.error('[CustomerRepository] Error deleting customer from Cloud MongoDB:', err);
      }
    }
    return true;
  }
  docToCustomer(doc: any): CustomerRecord {
    return {
      id: doc._id,
      name: doc.name,
      phone: doc.phone || '',
      email: doc.email || '',
      createdAt: doc.createdAt,
    };
  }
}
export const customerRepository = new CustomerRepository();
export default customerRepository;
