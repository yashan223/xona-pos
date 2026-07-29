import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Receipt, Search, RotateCcw, Printer, Clock } from 'lucide-react';
import { useNotification } from '@/context/NotificationContext';
import { transactionApi } from '@/lib/api';
import type { TransactionRecord, User } from '@/lib/api';
import { useTranslation } from '@/lib/translations';
let cachedTransactions: TransactionRecord[] | null = null;
interface SolutionsPageProps {
  currentUser: User | null;
}
export default function SolutionsPage({ currentUser }: SolutionsPageProps) {
  const { t } = useTranslation();
  const { confirm, toast } = useNotification();
  const [transactions, setTransactions] = useState<TransactionRecord[]>(cachedTransactions || []);
  const [filteredTransactions, setFilteredTransactions] = useState<TransactionRecord[]>(cachedTransactions || []);
  const [loading, setLoading] = useState(!cachedTransactions);
  const [searchQuery, setSearchQuery] = useState('');
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
    const isConfirmed = await confirm({
      title: 'Refund Transaction',
      message: 'Are you sure you want to refund this transaction? All items stock will be returned to inventory.',
      confirmText: 'Refund',
      cancelText: 'Cancel',
      type: 'danger'
    });
    if (!isConfirmed) return;
    try {
      const res = await transactionApi.refund(id);
      setTransactions(prev => {
        const updated = prev.map(t => t.id === id ? res.transaction : t);
        cachedTransactions = updated;
        return updated;
      });
      setFilteredTransactions(prev => prev.map(t => t.id === id ? res.transaction : t));
      toast.success(res.message || 'Transaction refunded successfully.');
    } catch (err: any) {
      toast.error(err.message || 'Refund failed');
    }
  };
  const formatCurrency = (val: number) => {
    return `Rs. ${Number(val).toFixed(2)}`;
  };
  const handlePrintReceipt = (_tx: TransactionRecord) => {
    window.print();
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t('transactionsLog')}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            ({filteredTransactions.length} total logs)
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
      <div className="relative">
        <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          placeholder={t('searchTransactions')}
          value={searchQuery}
          onChange={e => handleSearch(e.target.value)}
          className="w-full bg-card border border-border/50 rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:border-primary shadow-sm"
        />
      </div>
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
            <div key={tx.id} className="glass-card p-5 border border-border/60 rounded-2xl bg-card/60 flex flex-col justify-between hover:bg-card/80 transition-all shadow-md">
              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 border-b border-border/30 pb-3 mb-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-foreground">
                      ID: #{tx.id}
                    </span>
                    <span className={`text-[10px] uppercase font-bold px-2.5 py-0.5 rounded-full ${
                      tx.paymentStatus === 'paid' ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'
                    }`}>
                      {tx.paymentStatus}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground font-medium">Processed: {new Date(tx.createdAt).toLocaleString()}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground font-medium">Grand Total</p>
                  <p className="font-bold text-lg text-primary">{formatCurrency(tx.totalAmount)}</p>
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Purchase Summary</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  {tx.items.map(item => (
                    <div key={item.productId} className="flex justify-between p-2.5 rounded-xl bg-secondary/50 border border-border/30">
                      <span className="font-semibold truncate max-w-[200px] text-foreground">{item.name} (x{item.quantity})</span>
                      <span className="font-bold text-foreground/90">{formatCurrency(item.subtotal)}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex justify-between items-center mt-5 pt-3 border-t border-border/30">
                <div className="flex gap-4 text-xs text-muted-foreground font-medium">
                  <p>
                    Cashier: <span className="font-semibold text-foreground">{tx.cashierId}</span>
                  </p>
                  <p>
                    Customer: <span className="font-semibold text-foreground">{tx.customerId || 'Walk-in'}</span>
                  </p>
                  <p>
                    Method: <span className="font-semibold text-foreground uppercase">{tx.paymentMethod}</span>
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setSelectedTx(tx)}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-secondary border border-border/60 text-foreground text-xs font-semibold hover:bg-secondary/90 transition-colors cursor-pointer shadow-sm"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    View / Print
                  </button>
                  {(currentUser?.role === 'admin' || currentUser?.role === 'owner') && tx.paymentStatus !== 'refunded' && (
                    <button
                      onClick={() => handleRefund(tx.id)}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-destructive/15 border border-destructive/30 text-destructive text-xs font-semibold hover:bg-destructive/25 transition-colors cursor-pointer"
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
      {selectedTx && createPortal(
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[99999] flex items-center justify-center p-4">
          <div
            id="printable-receipt"
            className="w-full max-w-sm bg-[#0d1322] border border-slate-700/80 rounded-2xl shadow-2xl p-6 font-mono text-xs text-slate-100 flex flex-col justify-between h-[470px] relative z-[100000]"
          >
            <div className="text-center space-y-1 border-b border-slate-700/60 pb-3">
              <Receipt className="w-8 h-8 mx-auto text-primary" />
              <h3 className="text-sm font-bold tracking-wide text-white">XONA POS SYSTEM</h3>
              <p className="text-[10px] text-slate-400">Receipt Reprint</p>
            </div>
            <div className="flex-1 overflow-y-auto my-3 space-y-2.5 pr-1 text-slate-200">
              <div className="flex justify-between">
                <span className="text-slate-400">Receipt ID:</span>
                <span className="font-semibold text-white">{selectedTx.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Date:</span>
                <span>{new Date(selectedTx.createdAt).toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Cashier:</span>
                <span className="font-semibold text-white">{selectedTx.cashierId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Customer:</span>
                <span className="font-semibold text-white">{selectedTx.customerId || 'Walk-in'}</span>
              </div>
              <div className="border-t border-slate-700/60 pt-2 border-dotted">
                <p className="font-bold text-white border-b border-slate-700/40 pb-1">Items</p>
                {selectedTx.items.map(item => (
                  <div key={item.productId} className="flex justify-between my-1 text-[11px]">
                    <span className="text-slate-200">{item.name} (x{item.quantity})</span>
                    <span className="font-semibold text-white">{formatCurrency(item.subtotal)}</span>
                  </div>
                ))}
              </div>
              <div className="border-t border-slate-700/60 pt-2 border-dotted space-y-1 text-[11px]">
                <div className="flex justify-between">
                  <span className="text-slate-400">Subtotal:</span>
                  <span>{formatCurrency(selectedTx.subtotal)}</span>
                </div>
                {selectedTx.discount > 0 && (
                  <div className="flex justify-between text-green-400">
                    <span>Discount:</span>
                    <span>-{formatCurrency(selectedTx.discount)}</span>
                  </div>
                )}
                {selectedTx.tax > 0 && (
                  <div className="flex justify-between">
                    <span className="text-slate-400">VAT / Tax:</span>
                    <span>{formatCurrency(selectedTx.tax)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-xs border-t border-slate-700/40 pt-1 text-white">
                  <span>Grand Total:</span>
                  <span className="text-primary">{formatCurrency(selectedTx.totalAmount)}</span>
                </div>
              </div>
              <div className="flex justify-between border-t border-slate-700/60 pt-2 border-dotted text-[10px]">
                <span className="text-slate-400">Status / Method:</span>
                <span className="uppercase font-semibold text-white">{selectedTx.paymentStatus} / {selectedTx.paymentMethod}</span>
              </div>
            </div>
            <div className="flex gap-2 pt-2 border-t border-slate-700/60">
              <button
                onClick={() => handlePrintReceipt(selectedTx)}
                className="flex-1 py-2 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary/90 cursor-pointer flex items-center justify-center gap-1.5 transition-all shadow-md"
              >
                <Printer className="w-4 h-4" />
                Print Receipt
              </button>
              <button
                onClick={() => setSelectedTx(null)}
                className="flex-1 py-2 rounded-xl bg-slate-800 text-slate-200 border border-slate-700 font-semibold hover:bg-slate-700/80 cursor-pointer transition-all"
              >
                Close
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
