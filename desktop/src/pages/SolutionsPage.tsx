import { useEffect, useState } from 'react';
import { Receipt, Search, RotateCcw, Printer, Clock } from 'lucide-react';
import { transactionApi } from '@/lib/api';
import type { TransactionRecord, User } from '@/lib/api';

let cachedTransactions: TransactionRecord[] | null = null;

interface SolutionsPageProps {
  currentUser: User | null;
}

export default function SolutionsPage({ currentUser }: SolutionsPageProps) {
  const [transactions, setTransactions] = useState<TransactionRecord[]>(cachedTransactions || []);
  const [filteredTransactions, setFilteredTransactions] = useState<TransactionRecord[]>(cachedTransactions || []);
  const [loading, setLoading] = useState(!cachedTransactions);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Dialog receipt print modal
  const [selectedTx, setSelectedTx] = useState<TransactionRecord | null>(null);

  useEffect(() => {
    loadTransactions();
  }, []);

  async function loadTransactions() {
    if (!cachedTransactions) {
      setLoading(true);
    }
    try {
      const data = await transactionApi.getAll();
      setTransactions(data);
      setFilteredTransactions(data);
      cachedTransactions = data;
    } catch (err) {
      console.error('Failed to load transactions:', err);
    } finally {
      setLoading(false);
    }
  }

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (!query.trim()) {
      setFilteredTransactions(transactions);
      return;
    }
    const lower = query.toLowerCase();
    const filtered = transactions.filter(tx => 
      tx.id.toLowerCase().includes(lower) || 
      tx.cashierId.toLowerCase().includes(lower) ||
      (tx.customerId && tx.customerId.toLowerCase().includes(lower))
    );
    setFilteredTransactions(filtered);
  };

  const handleRefund = async (id: string) => {
    if (!confirm('Are you sure you want to refund this transaction? All items stock will be returned to inventory.')) return;
    try {
      const res = await transactionApi.refund(id);
      
      // Update transaction list in state
      setTransactions(prev => {
        const updated = prev.map(t => t.id === id ? res.transaction : t);
        cachedTransactions = updated;
        return updated;
      });

      setFilteredTransactions(prev => prev.map(t => t.id === id ? res.transaction : t));
      
      alert(res.message);
    } catch (err: any) {
      alert(err.message || 'Refund failed');
    }
  };

  const formatCurrency = (val: number) => {
    return `Rs. ${Number(val).toFixed(2)}`;
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Transactions Log</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Browse and manage transaction history receipts ({filteredTransactions.length} total logs)
          </p>
        </div>
        <button
          onClick={loadTransactions}
          className="p-2 rounded-lg bg-secondary hover:bg-secondary/80 text-muted-foreground transition-colors cursor-pointer"
          title="Refresh Logs"
        >
          <Clock className="w-4 h-4" />
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          placeholder="Search by Transaction ID, Cashier ID, or Customer ID..."
          value={searchQuery}
          onChange={e => handleSearch(e.target.value)}
          className="w-full bg-card border border-border/50 rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:border-primary shadow-sm"
        />
      </div>

      {/* Transactions Grid / List */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      ) : filteredTransactions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground border border-border/30 rounded-2xl bg-card/10">
          <Receipt className="w-12 h-12 mb-4 opacity-30 animate-pulse" />
          <p className="text-base font-medium">No transactions found</p>
          <p className="text-sm mt-1">No receipts match your search query or have been processed.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredTransactions.map(tx => (
            <div key={tx.id} className="glass-card p-5 border border-border/40 rounded-2xl bg-card/30 flex flex-col justify-between hover:bg-card/60 transition-all">
              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 border-b border-border/20 pb-3 mb-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-foreground">
                      ID: #{tx.id}
                    </span>
                    <span className={`text-[10px] uppercase font-bold px-2.5 py-0.5 rounded-full ${
                      tx.paymentStatus === 'paid' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                    }`}>
                      {tx.paymentStatus}
                    </span>
                  </div>
                  <p className="text-[10px] text-muted-foreground">Processed: {new Date(tx.createdAt).toLocaleString()}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Grand Total</p>
                  <p className="font-bold text-base text-primary">{formatCurrency(tx.totalAmount)}</p>
                </div>
              </div>

              {/* Items List */}
              <div className="space-y-2">
                <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Purchase Summary</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  {tx.items.map(item => (
                    <div key={item.productId} className="flex justify-between p-2 rounded-lg bg-secondary/30">
                      <span className="font-medium truncate max-w-[200px] text-foreground">{item.name} (x{item.quantity})</span>
                      <span className="font-bold text-muted-foreground">{formatCurrency(item.subtotal)}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-between items-center mt-5 pt-3 border-t border-border/20">
                <div className="flex gap-4 text-[10px] text-muted-foreground">
                  <p>
                    Cashier: <span className="font-medium text-foreground">{tx.cashierId}</span>
                  </p>
                  <p>
                    Customer: <span className="font-medium text-foreground">{tx.customerId || 'Walk-in'}</span>
                  </p>
                  <p>
                    Method: <span className="font-medium text-foreground uppercase">{tx.paymentMethod}</span>
                  </p>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => setSelectedTx(tx)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-secondary text-foreground text-xs font-semibold hover:bg-secondary/80 transition-colors cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    Print
                  </button>
                  {currentUser?.role === 'admin' && tx.paymentStatus !== 'refunded' && (
                    <button
                      onClick={() => handleRefund(tx.id)}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-destructive/15 border border-destructive/20 text-destructive text-xs font-semibold hover:bg-destructive/25 transition-colors cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      Refund
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Reprint simulated receipt modal */}
      {selectedTx && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-card border border-border rounded-xl shadow-xl p-6 font-mono text-xs text-foreground flex flex-col justify-between h-[450px]">
            <div className="text-center space-y-1 border-b border-border/40 pb-3">
              <Receipt className="w-8 h-8 mx-auto text-primary" />
              <h3 className="text-sm font-bold">XONA POS SYSTEM</h3>
              <p className="text-[10px] text-muted-foreground">Receipt Reprint</p>
            </div>
            
            <div className="flex-1 overflow-y-auto my-3 space-y-2.5">
              <div className="flex justify-between">
                <span>Receipt ID:</span>
                <span>{selectedTx.id}</span>
              </div>
              <div className="flex justify-between">
                <span>Date:</span>
                <span>{new Date(selectedTx.createdAt).toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span>Cashier:</span>
                <span>{selectedTx.cashierId}</span>
              </div>
              <div className="flex justify-between">
                <span>Customer:</span>
                <span>{selectedTx.customerId || 'Walk-in'}</span>
              </div>

              <div className="border-t border-border/30 pt-2 border-dotted">
                <p className="font-bold border-b border-border/10 pb-1">Items</p>
                {selectedTx.items.map(item => (
                  <div key={item.productId} className="flex justify-between my-0.5 text-[10px]">
                    <span>{item.name} (x{item.quantity})</span>
                    <span>{formatCurrency(item.subtotal)}</span>
                  </div>
                ))}
              </div>

              <div className="border-t border-border/30 pt-2 border-dotted space-y-1 text-[10px]">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>{formatCurrency(selectedTx.subtotal)}</span>
                </div>
                {selectedTx.discount > 0 && (
                  <div className="flex justify-between text-success">
                    <span>Discount:</span>
                    <span>-{formatCurrency(selectedTx.discount)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>Tax (8%):</span>
                  <span>{formatCurrency(selectedTx.tax)}</span>
                </div>
                <div className="flex justify-between font-bold text-xs border-t border-border/10 pt-1">
                  <span>Grand Total:</span>
                  <span>{formatCurrency(selectedTx.totalAmount)}</span>
                </div>
              </div>

              <div className="flex justify-between border-t border-border/30 pt-2 border-dotted">
                <span>Status / Method:</span>
                <span className="uppercase">{selectedTx.paymentStatus} / {selectedTx.paymentMethod}</span>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => window.print()}
                className="flex-1 py-1.5 rounded bg-secondary text-foreground font-semibold hover:bg-secondary/80 cursor-pointer"
              >
                Print
              </button>
              <button
                onClick={() => setSelectedTx(null)}
                className="flex-1 py-1.5 rounded bg-primary text-primary-foreground font-semibold hover:bg-primary/95 cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
