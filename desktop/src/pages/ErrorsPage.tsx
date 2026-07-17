import { useEffect, useState, useCallback } from 'react';
import { Package, Plus, Trash2, Edit3, Save, X } from 'lucide-react';
import SearchBar from '@/components/SearchBar';
import { productApi } from '@/lib/api';
import type { ProductRecord, User } from '@/lib/api';

let cachedProducts: ProductRecord[] | null = null;

interface ErrorsPageProps {
  currentUser: User | null;
}

export default function ErrorsPage({ currentUser }: ErrorsPageProps) {
  const [products, setProducts] = useState<ProductRecord[]>(cachedProducts || []);
  const [loading, setLoading] = useState(!cachedProducts);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Form states
  const [isEditing, setIsEditing] = useState<string | null>(null); // product ID or 'new'
  const [formName, setFormName] = useState('');
  const [formSku, setFormSku] = useState('');
  const [formCategory, setFormCategory] = useState('');
  const [formPrice, setFormPrice] = useState('');
  const [formCost, setFormCost] = useState('');
  const [formStock, setFormStock] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formImageUrl, setFormImageUrl] = useState('');
  const [formError, setFormError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [formTrackStock, setFormTrackStock] = useState(true);

  useEffect(() => {
    loadProducts();

    const handleUpdate = () => {
      loadProducts();
    };
    window.addEventListener('products_updated', handleUpdate);
    return () => {
      window.removeEventListener('products_updated', handleUpdate);
    };
  }, []);

  async function loadProducts() {
    if (!cachedProducts) {
      setLoading(true);
    }
    try {
      const data = await productApi.getAll();
      setProducts(data);
      cachedProducts = data;
    } catch (err) {
      console.error('Failed to load products:', err);
    } finally {
      setLoading(false);
    }
  }

  const handleSearch = useCallback(async (query: string) => {
    setSearchQuery(query);
    if (!query.trim()) {
      loadProducts();
      return;
    }
    try {
      const results = await productApi.search(query);
      setProducts(results);
    } catch (err) {
      console.error('Search failed:', err);
    }
  }, []);

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this product?')) return;
    try {
      await productApi.delete(id);
      setProducts(prev => {
        const updated = prev.filter(p => p.id !== id);
        cachedProducts = updated;
        return updated;
      });
    } catch (err) {
      console.error('Failed to delete product:', err);
    }
  }

  const startEdit = (prod: ProductRecord) => {
    setIsEditing(prod.id);
    setFormName(prod.name);
    setFormSku(prod.sku);
    setFormCategory(prod.category);
    setFormPrice(prod.price.toString());
    setFormCost(prod.cost.toString());
    setFormTrackStock(prod.stock >= 0);
    setFormStock(prod.stock >= 0 ? prod.stock.toString() : '');
    setFormDescription(prod.description || '');
    setFormImageUrl(prod.imageUrl || '');
    setFormError('');
  };

  const startAddNew = () => {
    setIsEditing('new');
    setFormName('');
    setFormSku('');
    setFormCategory('');
    setFormPrice('');
    setFormCost('');
    setFormTrackStock(true);
    setFormStock('');
    setFormDescription('');
    setFormImageUrl('');
    setFormError('');
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setFormError('');
    try {
      const res = await productApi.uploadImage(file);
      setFormImageUrl(res.imageUrl);
    } catch (err: any) {
      console.error('Image upload failed:', err);
      setFormError(err.message || 'Image upload failed.');
    } finally {
      setUploading(false);
    }
  };

  const cancelEdit = () => {
    setIsEditing(null);
  };

  const saveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName || !formSku || !formPrice) {
      setFormError('Name, SKU and Price are required.');
      return;
    }

    const payload = {
      name: formName,
      sku: formSku,
      category: formCategory || 'General',
      price: parseFloat(formPrice),
      cost: parseFloat(formCost || '0'),
      stock: formTrackStock ? parseInt(formStock || '0', 10) : -1,
      description: formDescription,
      imageUrl: formImageUrl,
    };

    try {
      if (isEditing === 'new') {
        const created = await productApi.create(payload);
        setProducts(prev => {
          const updated = [...prev, created];
          cachedProducts = updated;
          return updated;
        });
      } else if (isEditing) {
        const updated = await productApi.update(isEditing, payload);
        setProducts(prev => {
          const revised = prev.map(p => (p.id === isEditing ? updated : p));
          cachedProducts = revised;
          return revised;
        });
      }
      setIsEditing(null);
    } catch (err: any) {
      setFormError(err.message || 'Failed to save product.');
    }
  };

  const formatCurrency = (val: number) => {
    return `Rs. ${Number(val).toFixed(2)}`;
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Products Catalog</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {products.length} product{products.length !== 1 ? 's' : ''} stored in AVL Tree
            {searchQuery && ` · searching "${searchQuery}"`}
          </p>
        </div>
        {currentUser?.role === 'admin' && (
          <button
            onClick={startAddNew}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors cursor-pointer text-sm shadow-md shadow-primary/20"
          >
            <Plus className="w-4 h-4" />
            Add Product
          </button>
        )}
      </div>

      {/* Editor Modal / Inline Form */}
      {isEditing && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-start justify-center p-4 overflow-y-auto md:py-12">
          <div className="glass-card w-full max-w-lg bg-card border border-border rounded-2xl shadow-xl overflow-hidden p-6 animate-scale-in">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold">
                {isEditing === 'new' ? 'Add New Product' : 'Edit Product'}
              </h3>
              <button onClick={cancelEdit} className="p-1 text-muted-foreground hover:text-foreground cursor-pointer rounded-lg hover:bg-secondary">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={saveProduct} className="space-y-4">
              {formError && <p className="text-xs text-destructive bg-destructive/10 p-2.5 rounded-lg font-medium">{formError}</p>}
              
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="text-xs text-muted-foreground font-semibold mb-1 block">Product Name *</label>
                  <input
                    type="text"
                    value={formName}
                    onChange={e => setFormName(e.target.value)}
                    className="w-full bg-secondary/40 border border-border/50 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary"
                    placeholder="e.g. iPad Air 256GB"
                  />
                </div>

                <div>
                  <label className="text-xs text-muted-foreground font-semibold mb-1 block">SKU / Barcode *</label>
                  <input
                    type="text"
                    value={formSku}
                    onChange={e => setFormSku(e.target.value)}
                    className="w-full bg-secondary/40 border border-border/50 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary"
                    placeholder="e.g. SKU-E-IPAD"
                  />
                </div>

                <div>
                  <label className="text-xs text-muted-foreground font-semibold mb-1 block">Category</label>
                  <input
                    type="text"
                    value={formCategory}
                    onChange={e => setFormCategory(e.target.value)}
                    className="w-full bg-secondary/40 border border-border/50 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary"
                    placeholder="e.g. Electronics"
                  />
                </div>

                <div>
                  <label className="text-xs text-muted-foreground font-semibold mb-1 block">Price (LKR) *</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formPrice}
                    onChange={e => setFormPrice(e.target.value)}
                    className="w-full bg-secondary/40 border border-border/50 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary"
                    placeholder="e.g. 599.99"
                  />
                </div>

                <div>
                  <label className="text-xs text-muted-foreground font-semibold mb-1 block">Cost (LKR)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formCost}
                    onChange={e => setFormCost(e.target.value)}
                    className="w-full bg-secondary/40 border border-border/50 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary"
                    placeholder="e.g. 420.00"
                  />
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-xs text-muted-foreground font-semibold">Stock Quantity</label>
                    <label className="text-[10px] text-primary font-semibold flex items-center gap-1 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={formTrackStock}
                        onChange={e => setFormTrackStock(e.target.checked)}
                        className="rounded border-border text-primary focus:ring-primary/20"
                      />
                      Track Inventory
                    </label>
                  </div>
                  <input
                    type="number"
                    value={formStock}
                    onChange={e => setFormStock(e.target.value)}
                    disabled={!formTrackStock}
                    className="w-full bg-secondary/40 border border-border/50 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary disabled:opacity-40 transition-all"
                    placeholder={formTrackStock ? "e.g. 10" : "Unlimited stock"}
                  />
                </div>

                <div className="col-span-2">
                  <label className="text-xs text-muted-foreground font-semibold mb-1 block">Image URL</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={formImageUrl}
                      onChange={e => setFormImageUrl(e.target.value)}
                      className="flex-1 min-w-0 bg-secondary/40 border border-border/50 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary"
                      placeholder="https://..."
                    />
                    <label className="px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold rounded-lg flex items-center justify-center cursor-pointer transition-colors select-none flex-shrink-0">
                      {uploading ? 'Uploading...' : 'Upload'}
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                        disabled={uploading}
                      />
                    </label>
                  </div>
                </div>
              </div>

              <div>
                <label className="text-xs text-muted-foreground font-semibold mb-1 block">Description</label>
                <textarea
                  value={formDescription}
                  onChange={e => setFormDescription(e.target.value)}
                  className="w-full bg-secondary/40 border border-border/50 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary h-20 resize-none"
                  placeholder="Product notes and specs..."
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={cancelEdit}
                  className="px-4 py-2 rounded-lg bg-secondary text-foreground hover:bg-secondary/80 text-sm font-semibold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors flex items-center gap-2 cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Search Bar */}
      <SearchBar
        placeholder="Search product catalog by prefix (O(log N) AVL Tree lookup)..."
        onSearch={handleSearch}
      />

      {/* Products Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      ) : products.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground border border-border/30 rounded-2xl bg-card/10">
          <Package className="w-12 h-12 mb-4 opacity-30" />
          <p className="text-base font-medium">
            {searchQuery ? 'No matching products found' : 'No products in catalog yet'}
          </p>
          <p className="text-sm mt-1">
            {searchQuery ? 'Try another search query' : 'Add products to begin checkout'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {products.map(prod => (
            <div key={prod.id} className="glass-card p-5 border border-border/40 rounded-2xl bg-card/30 flex flex-col justify-between hover:bg-card/60 transition-all hover:scale-[1.01] hover:border-primary/20">
              <div className="flex gap-4">
                {prod.imageUrl ? (
                  <img src={prod.imageUrl} alt={prod.name} className="w-16 h-16 rounded-xl object-cover border border-border/50 flex-shrink-0" />
                ) : (
                  <div className="w-16 h-16 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0 text-primary border border-primary/20">
                    <Package className="w-7 h-7" />
                  </div>
                )}
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] bg-primary/15 text-primary border border-primary/20 font-bold px-2 py-0.5 rounded-md">
                      {prod.category}
                    </span>
                    <span className="text-[10px] bg-secondary text-muted-foreground font-mono px-2 py-0.5 rounded-md">
                      {prod.sku}
                    </span>
                  </div>
                  <h3 className="font-bold text-sm text-foreground">{prod.name}</h3>
                  <p className="text-xs text-muted-foreground line-clamp-2">{prod.description || 'No description provided.'}</p>
                </div>
              </div>

              <div className="flex justify-between items-center mt-5 pt-3 border-t border-border/20">
                <div className="flex gap-6">
                  <div>
                    <p className="text-[10px] text-muted-foreground">Price</p>
                    <p className="font-bold text-sm text-primary">{formatCurrency(prod.price)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground">Stock</p>
                    <p className={`font-semibold text-sm ${prod.stock === -1 ? 'text-emerald-400' : (prod.stock < 5 ? 'text-destructive font-bold animate-pulse' : 'text-foreground')}`}>
                      {prod.stock === -1 ? 'Unlimited' : `${prod.stock} units`}
                    </p>
                  </div>
                  {currentUser?.role === 'admin' && (
                    <div>
                      <p className="text-[10px] text-muted-foreground">Cost</p>
                      <p className="font-medium text-sm text-muted-foreground">{formatCurrency(prod.cost)}</p>
                    </div>
                  )}
                </div>

                {currentUser?.role === 'admin' && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => startEdit(prod)}
                      className="p-2 rounded-lg bg-secondary/80 hover:bg-primary/20 hover:text-primary text-muted-foreground transition-all cursor-pointer"
                      title="Edit Product"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(prod.id)}
                      className="p-2 rounded-lg bg-secondary/80 hover:bg-destructive/20 hover:text-destructive text-muted-foreground transition-all cursor-pointer"
                      title="Delete Product"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
