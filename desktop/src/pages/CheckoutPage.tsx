import { useState, useEffect, useRef } from 'react';
import { ShoppingCart, Search, Plus, Minus, Trash2, Tag, Sparkles, CheckCircle2, RefreshCw, Printer, Banknote } from 'lucide-react';
import { useNotification } from '@/context/NotificationContext';
import { productApi, transactionApi, graphApi, BASE_HOST } from '@/lib/api';
import type { ProductRecord, TransactionItem, User, GraphNode } from '@/lib/api';

interface CheckoutPageProps {
  currentUser: User | null;
  onSuccess?: () => void;
}

export default function CheckoutPage({ currentUser }: CheckoutPageProps) {
  const { toast } = useNotification();
  const [catalog, setCatalog] = useState<ProductRecord[]>([]);
  const [filteredCatalog, setFilteredCatalog] = useState<ProductRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  // Cart state
  const [cart, setCart] = useState<(TransactionItem & { product: ProductRecord })[]>([]);
  const [discountPercent, setDiscountPercent] = useState<number>(0);
  const paymentMethod = 'cash';

  // Recommendations state (powered by co-occurrence Graph BFS)
  const [recommendations, setRecommendations] = useState<GraphNode[]>([]);

  // UI states
  const [loading, setLoading] = useState(true);
  const [checkoutResult, setCheckoutResult] = useState<any | null>(null); // receipt modal

  // Derived categories list
  const categories = ['All', ...Array.from(new Set(catalog.map(p => p.category)))];

  const filterRef = useRef({ searchQuery, selectedCategory });
  useEffect(() => {
    filterRef.current = { searchQuery, selectedCategory };
  }, [searchQuery, selectedCategory]);

  useEffect(() => {
    loadData();

    const handleProductsUpdate = async () => {
      try {
        const data = await productApi.getAll();
        setCatalog(data);
        const { searchQuery: q, selectedCategory: cat } = filterRef.current;
        let list = [...data];
        if (cat !== 'All') {
          list = list.filter(p => p.category === cat);
        }
        if (q.trim()) {
          const lower = q.toLowerCase();
          list = list.filter(p => p.name.toLowerCase().includes(lower) || p.sku.toLowerCase().includes(lower));
        }
        setFilteredCatalog(list);
      } catch (err) {
        console.error('Failed to reload products:', err);
      }
    };

    window.addEventListener('products_updated', handleProductsUpdate);

    return () => {
      window.removeEventListener('products_updated', handleProductsUpdate);
    };
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const prodData = await productApi.getAll();
      setCatalog(prodData);
      setFilteredCatalog(prodData);
    } catch (err) {
      console.error('Failed to load register data:', err);
    } finally {
      setLoading(false);
    }
  }

  // Handle product filter
  const filterCatalog = (query: string, category: string) => {
    let list = [...catalog];
    if (category !== 'All') {
      list = list.filter(p => p.category === category);
    }
    if (query.trim()) {
      const lower = query.toLowerCase();
      list = list.filter(p => p.name.toLowerCase().includes(lower) || p.sku.toLowerCase().includes(lower));
    }
    setFilteredCatalog(list);
  };

  const handleSearchChange = (val: string) => {
    setSearchQuery(val);
    filterCatalog(val, selectedCategory);
  };

  const handleCategorySelect = (cat: string) => {
    setSelectedCategory(cat);
    filterCatalog(searchQuery, cat);
  };

  // Add to cart
  const addToCart = (product: ProductRecord) => {
    const isUnlimited = product.stock === -1;
    if (!isUnlimited && product.stock <= 0) {
      toast.warning('Product is out of stock!');
      return;
    }

    setCart(prev => {
      const existing = prev.find(item => item.productId === product.id);
      let updated;
      if (existing) {
        if (!isUnlimited && existing.quantity >= product.stock) {
          toast.warning(`Cannot add more. Only ${product.stock} units available in inventory.`);
          return prev;
        }
        updated = prev.map(item =>
          item.productId === product.id
            ? { ...item, quantity: item.quantity + 1, subtotal: (item.quantity + 1) * product.price }
            : item
        );
      } else {
        updated = [...prev, {
          productId: product.id,
          name: product.name,
          price: product.price,
          quantity: 1,
          subtotal: product.price,
          product
        }];
      }

      // Fetch Bought-Together Recommendations based on the last added product
      loadRecommendations(product.id);

      return updated;
    });
  };

  const updateCartQty = (productId: string, delta: number) => {
    setCart(prev => {
      return prev.map(item => {
        if (item.productId !== productId) return item;
        const newQty = item.quantity + delta;
        if (newQty <= 0) return null;
        const isUnlimited = item.product.stock === -1;
        if (!isUnlimited && newQty > item.product.stock) {
          toast.warning(`Cannot add more. Only ${item.product.stock} units available.`);
          return item;
        }
        return {
          ...item,
          quantity: newQty,
          subtotal: newQty * item.price
        };
      }).filter(Boolean) as any[];
    });
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item.productId !== productId));
  };

  // Recommendations loader using Graph API
  async function loadRecommendations(productId: string) {
    try {
      const graphData = await graphApi.getRelated(productId, 2);
      // Filter out products already in the cart and only show 'product' nodes
      const cartProductIds = cart.map(i => i.productId).concat([productId]);
      const filteredRecs = graphData.nodes.filter(n =>
        n.type === 'product' && !cartProductIds.includes(n.id)
      );
      setRecommendations(filteredRecs.slice(0, 3));
    } catch (err) {
      console.error('Recommendations load error:', err);
    }
  }



  // Checkout process
  const processCheckout = async () => {
    if (cart.length === 0) {
      toast.warning('Cart is empty.');
      return;
    }
    if (!currentUser) {
      toast.warning('Cashier is not logged in.');
      return;
    }

    try {
      const tx = await transactionApi.create({
        cashierId: currentUser.username,
        customerId: null,
        items: cart.map(i => ({
          productId: i.productId,
          name: i.name,
          price: i.price,
          quantity: i.quantity,
          subtotal: i.subtotal
        })),
        subtotal: cartSubtotal,
        discount: discountAmount,
        tax: cartTax,
        totalAmount: cartTotal,
        paymentMethod: paymentMethod,
      });

      setCheckoutResult(tx);
      setCart([]);
      setDiscountPercent(0);
      setRecommendations([]);
      toast.success('Checkout completed successfully!');

      // Reload stock catalogs
      const updatedCatalog = await productApi.getAll();
      setCatalog(updatedCatalog);
      setFilteredCatalog(updatedCatalog);
    } catch (err: any) {
      toast.error(err.message || 'Checkout process failed.');
    }
  };

  // Calculations
  const vatEnabled = localStorage.getItem('vatEnabled') !== 'false';
  const vatPercentage = parseFloat(localStorage.getItem('vatPercentage') || '8');
  const cartSubtotal = cart.reduce((sum, item) => sum + item.subtotal, 0);
  const discountAmount = parseFloat((cartSubtotal * (discountPercent / 100)).toFixed(2));
  const cartTax = vatEnabled ? parseFloat(((cartSubtotal - discountAmount) * (vatPercentage / 100)).toFixed(2)) : 0;
  const cartTotal = parseFloat((cartSubtotal - discountAmount + cartTax).toFixed(2));

  const formatCurrency = (val: number) => {
    return `Rs. ${Number(val).toFixed(2)}`;
  };

  return (
    <div className="flex flex-col lg:flex-row h-[calc(100vh-10px)] overflow-hidden animate-fade-in relative">

      {/* Catalog / Left Panel */}
      <div className="flex-1 flex flex-col p-6 overflow-y-auto space-y-4 border-r border-border/20">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold tracking-tight">Checkout</h1>
            <p className="text-xs text-muted-foreground">Scan or select items to checkout</p>
          </div>
          <button onClick={loadData} className="p-2 rounded-lg bg-secondary hover:bg-secondary/80 text-muted-foreground cursor-pointer">
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search products by SKU or name..."
            value={searchQuery}
            onChange={e => handleSearchChange(e.target.value)}
            className="w-full bg-card border border-border/50 rounded-xl pl-9 pr-4 py-2 text-sm focus:outline-none focus:border-primary shadow-sm"
          />
        </div>

        {/* Categories Tab */}
        <div className="flex gap-2 overflow-x-auto pb-1.5 scrollbar-thin">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => handleCategorySelect(cat)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap cursor-pointer transition-colors ${selectedCategory === cat
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'bg-secondary/60 hover:bg-secondary text-muted-foreground'
                }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Catalog Grid */}
        {loading ? (
          <div className="flex items-center justify-center flex-1">
            <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          </div>
        ) : filteredCatalog.length === 0 ? (
          <div className="flex flex-col items-center justify-center flex-1 text-muted-foreground text-center py-10">
            <ShoppingCart className="w-12 h-12 mb-3 opacity-30" />
            <p className="text-sm font-medium">No matching catalog items</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 overflow-y-auto pr-1">
            {filteredCatalog.map(prod => (
              <button
                key={prod.id}
                onClick={() => addToCart(prod)}
                disabled={prod.stock === 0}
                className={`glass-card p-3 border border-border/30 rounded-xl bg-card/20 hover:bg-card/50 hover:border-primary/20 text-left transition-all flex flex-col justify-between h-36 ${prod.stock === 0 ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'
                  }`}
              >
                <div>
                  <div className="flex justify-between items-start gap-1">
                    <span className="text-[9px] bg-secondary px-1.5 py-0.5 rounded font-mono text-muted-foreground">
                      {prod.sku}
                    </span>
                    <span className={`text-[8px] font-bold px-1 py-0.25 rounded uppercase ${prod.stock === -1 ? 'bg-green-500/20 text-green-400' : (prod.stock < 5 ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400')
                      }`}>
                      Stock: {prod.stock === -1 ? 'Unlimited' : prod.stock}
                    </span>
                  </div>
                  <h4 className="font-semibold text-xs text-foreground mt-2 line-clamp-2">{prod.name}</h4>
                </div>
                <div className="flex justify-between items-end mt-2">
                  <span className="font-bold text-xs text-primary">{formatCurrency(prod.price)}</span>
                  <div className="p-1 rounded-md bg-primary/10 text-primary">
                    <Plus className="w-3.5 h-3.5" />
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Graph recommendations */}
        {recommendations.length > 0 && (
          <div className="p-3.5 bg-primary/5 border border-primary/20 rounded-xl space-y-2">
            <h4 className="text-xs font-bold text-primary flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 animate-pulse" />
              Frequently Bought Together
            </h4>
            <div className="flex gap-2">
              {recommendations.map(node => {
                const catalogProd = catalog.find(p => p.id === node.id);
                if (!catalogProd) return null;
                return (
                  <button
                    key={node.id}
                    onClick={() => addToCart(catalogProd)}
                    className="flex-1 p-2 bg-card border border-border/40 hover:border-primary/30 rounded-lg text-left transition-all text-[10px] font-medium truncate flex justify-between items-center cursor-pointer"
                  >
                    <div className="truncate pr-1">
                      <p className="font-semibold truncate text-foreground">{node.label}</p>
                      <p className="text-primary font-bold">{formatCurrency(catalogProd.price)}</p>
                    </div>
                    <Plus className="w-3 h-3 text-primary flex-shrink-0" />
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Cart / Right Panel */}
      <div className="w-full lg:w-[360px] bg-sidebar border-t lg:border-t-0 border-sidebar-border p-6 flex flex-col justify-between h-[calc(100vh-10px)]">

        {/* Cart Title & Customer Selection */}
        <div className="space-y-4">
          <div className="flex justify-between items-center border-b border-sidebar-border pb-3">
            <h2 className="text-base font-bold flex items-center gap-2">
              <ShoppingCart className="w-4 h-4 text-primary" />
              Current Basket
            </h2>
            <span className="text-[10px] bg-primary/15 text-primary border border-primary/25 font-bold px-2 py-0.5 rounded-full">
              {cart.reduce((sum, item) => sum + item.quantity, 0)} Items
            </span>
          </div>


        </div>

        {/* Cart Items List */}
        <div className="flex-1 overflow-y-auto py-4 space-y-2.5 pr-1 scrollbar-thin">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground text-center">
              <ShoppingCart className="w-8 h-8 mb-2 opacity-25" />
              <p className="text-xs">Basket is empty</p>
            </div>
          ) : (
            cart.map(item => (
              <div key={item.productId} className="flex justify-between items-center gap-2 p-2.5 border border-sidebar-border/40 rounded-xl bg-secondary/10">
                <div className="min-w-0 flex-1">
                  <h5 className="font-semibold text-xs text-foreground truncate">{item.name}</h5>
                  <p className="text-[10px] text-muted-foreground">{formatCurrency(item.price)} each</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button onClick={() => updateCartQty(item.productId, -1)} className="p-1 rounded bg-secondary hover:bg-secondary/80 cursor-pointer">
                    <Minus className="w-2.5 h-2.5" />
                  </button>
                  <span className="font-mono text-xs font-bold w-4 text-center">{item.quantity}</span>
                  <button onClick={() => updateCartQty(item.productId, 1)} className="p-1 rounded bg-secondary hover:bg-secondary/80 cursor-pointer">
                    <Plus className="w-2.5 h-2.5" />
                  </button>
                  <button onClick={() => removeFromCart(item.productId)} className="p-1 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 cursor-pointer ml-1">
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Checkout Summary & Pay Buttons */}
        <div className="border-t border-sidebar-border pt-4 space-y-4">
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Subtotal</span>
              <span>{formatCurrency(cartSubtotal)}</span>
            </div>

            {/* Discount row */}
            <div className="flex justify-between text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Tag className="w-3 h-3 text-success" />
                Discount (%)
              </span>
              <input
                type="number"
                min="0"
                max="100"
                value={discountPercent || ''}
                onChange={e => setDiscountPercent(Math.min(100, Math.max(0, parseInt(e.target.value, 10) || 0)))}
                className="w-12 bg-secondary/40 border border-sidebar-border rounded px-1.5 py-0.5 text-center text-xs text-foreground focus:outline-none"
              />
            </div>

            <div className="flex justify-between text-xs text-muted-foreground">
              <span>VAT ({vatEnabled ? `${vatPercentage}%` : 'Disabled'})</span>
              <span>{formatCurrency(cartTax)}</span>
            </div>

            <div className="flex justify-between text-sm font-bold text-foreground pt-1.5 border-t border-sidebar-border/30">
              <span>Total Amount</span>
              <span className="text-primary">{formatCurrency(cartTotal)}</span>
            </div>
          </div>

          {/* Checkout Button */}
          <button
            onClick={processCheckout}
            disabled={cart.length === 0}
            className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground font-bold shadow-md shadow-primary/20 hover:bg-primary/95 transition-all text-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Banknote className="w-4 h-4" />
            Complete Checkout {formatCurrency(cartTotal)}
          </button>
        </div>
      </div>



      {/* Checkout Receipt Modal (Fixed and Scrollable layout) */}
      {checkoutResult && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-card w-full max-w-sm max-h-[90vh] bg-card border border-border rounded-2xl shadow-xl flex flex-col overflow-hidden animate-scale-in">
            {/* Header */}
            <div className="text-center p-6 border-b border-border/40 flex-shrink-0 space-y-2">
              <CheckCircle2 className="w-12 h-12 text-success mx-auto" />
              <h2 className="text-lg font-bold">Transaction Complete</h2>
              <p className="text-xs text-muted-foreground">Receipt #{checkoutResult.id}</p>
            </div>

            {/* Scrollable Receipt details */}
            <div className="flex-1 overflow-y-auto p-6 space-y-3 font-mono text-xs scrollbar-thin">
              <div className="flex justify-between">
                <span>Date:</span>
                <span>{new Date(checkoutResult.createdAt).toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span>Cashier:</span>
                <span>{checkoutResult.cashierId}</span>
              </div>


              <div className="border-t border-border/40 pt-2 border-dotted">
                <p className="font-bold mb-1 border-b border-border/20 pb-1">Items List</p>
                {checkoutResult.items.map((item: any) => (
                  <div key={item.productId} className="flex justify-between text-[11px] my-1">
                    <span>{item.name} (x{item.quantity})</span>
                    <span>{formatCurrency(item.subtotal)}</span>
                  </div>
                ))}
              </div>

              <div className="border-t border-border/40 pt-2 border-dotted space-y-1">
                <div className="flex justify-between text-[11px]">
                  <span>Subtotal:</span>
                  <span>{formatCurrency(checkoutResult.subtotal)}</span>
                </div>
                {checkoutResult.discount > 0 && (
                  <div className="flex justify-between text-[11px] text-success">
                    <span>Discount:</span>
                    <span>-{formatCurrency(checkoutResult.discount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-[11px]">
                  <span>VAT:</span>
                  <span>{formatCurrency(checkoutResult.tax)}</span>
                </div>
                <div className="flex justify-between font-bold text-sm border-t border-border/20 pt-1">
                  <span>Grand Total:</span>
                  <span>{formatCurrency(checkoutResult.totalAmount)}</span>
                </div>
              </div>

              <div className="flex justify-between pt-2 border-t border-border/40 border-dotted">
                <span>Pay Method:</span>
                <span className="uppercase">{checkoutResult.paymentMethod}</span>
              </div>
            </div>

            {/* Actions Footer */}
            <div className="flex gap-2 p-6 border-t border-border/40 flex-shrink-0">
              {checkoutResult.pdfUrl ? (
                <button
                  onClick={() => {
                    const fullUrl = `${BASE_HOST}${checkoutResult.pdfUrl}`;
                    window.open(fullUrl, '_blank');
                  }}
                  className="flex-1 py-2 rounded-lg bg-secondary text-foreground hover:bg-secondary/80 text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Printer className="w-3.5 h-3.5" />
                  View PDF Bill
                </button>
              ) : (
                <button
                  onClick={() => {
                    window.print();
                  }}
                  className="flex-1 py-2 rounded-lg bg-secondary text-foreground text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Printer className="w-3.5 h-3.5" />
                  Print Receipt
                </button>
              )}
              <button
                onClick={() => setCheckoutResult(null)}
                className="flex-1 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-bold transition-all cursor-pointer"
              >
                Next Customer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
