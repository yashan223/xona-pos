import { Request, Response } from 'express';
import customerRepository from '../repositories/customerRepository.js';

class CustomerController {
  create = async (req: Request, res: Response) => {
    try {
      const { name, phone, email } = req.body;

      if (!name) {
        return res.status(400).json({ error: 'Customer name is required' });
      }

      const customer = await customerRepository.addCustomer({
        name,
        phone,
        email,
        loyaltyPoints: 0,
      });

      res.status(201).json(customer);
    } catch (err) {
      console.error('[customers] POST error:', err);
      res.status(500).json({ error: 'Failed to create customer record' });
    }
  };

  getAll = async (req: Request, res: Response) => {
    try {
      const customers = await customerRepository.getAllCustomers();
      res.json(customers);
    } catch (err) {
      console.error('[customers] GET all error:', err);
      res.status(500).json({ error: 'Failed to retrieve customers' });
    }
  };

  getById = async (req: Request, res: Response) => {
    try {
      const customer = await customerRepository.getCustomerById(req.params.id as string);
      if (!customer) {
        return res.status(404).json({ error: 'Customer not found' });
      }
      res.json(customer);
    } catch (err) {
      console.error('[customers] GET by id error:', err);
      res.status(500).json({ error: 'Failed to retrieve customer' });
    }
  };

  delete = async (req: Request, res: Response) => {
    try {
      const success = await customerRepository.deleteCustomer(req.params.id as string);
      if (!success) {
        return res.status(404).json({ error: 'Customer not found' });
      }
      res.json({ message: 'Customer deleted successfully' });
    } catch (err) {
      console.error('[customers] DELETE error:', err);
      res.status(500).json({ error: 'Failed to delete customer' });
    }
  };
}

export const customerController = new CustomerController();
export default customerController;
