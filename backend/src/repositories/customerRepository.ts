import { CustomerModel } from '../persistence/database.js';
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

    await CustomerModel.findOneAndUpdate(
      { _id: record.id },
      {
        _id: record.id,
        name: record.name,
        phone: record.phone,
        email: record.email,
        createdAt: record.createdAt,
      },
      { upsert: true, returnDocument: 'after' }
    );

    return record;
  }

  async getAllCustomers(): Promise<CustomerRecord[]> {
    const docs = await CustomerModel.find().sort({ name: 1 }).lean();
    return docs.map((doc: any) => this.docToCustomer(doc));
  }

  async getCustomerById(id: string): Promise<CustomerRecord | null> {
    const doc = await CustomerModel.findById(id).lean() as any;
    return doc ? this.docToCustomer(doc) : null;
  }

  async deleteCustomer(id: string): Promise<boolean> {
    const res = await CustomerModel.deleteOne({ _id: id });
    return Boolean(res.deletedCount && res.deletedCount > 0);
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
