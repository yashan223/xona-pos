import { useEffect, useState, useCallback } from 'react';
import { Package, Plus, Trash2, Edit3, Save, X } from 'lucide-react';
import SearchBar from '@/components/SearchBar';
import { useNotification } from '@/context/NotificationContext';
import { productApi } from '@/lib/api';
import type { ProductRecord, User } from '@/lib/api';
import { useTranslation } from '@/lib/translations';
import StockPresetsTab from '@/components/StockPresetsTab';
let cachedProducts: ProductRecord[] | null = null;
interface ProductsPageProps {
  currentUser: User | null;
}
export default function ProductsPage({ currentUser }: ProductsPageProps) {
  const { t } = useTranslation();
  const { confirm, toast } = useNotification();
  const [products, setProducts] = useState<ProductRecord[]>(cachedProducts || []);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(!cachedProducts);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('All');
  const [activeTab, setActiveTab] = useState<'inventory' | 'presets'>('inventory');
  const [isEditing, setIsEditing] = useState<string | null>(null); 
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
  const [showNewCatInput, setShowNewCatInput] = useState(false);
  const [newCatName, setNewCatName] = useState('');
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
      const savedCats = localStorage.getItem('product_categories');
      const customCats = savedCats ? JSON.parse(savedCats) : ['General', 'Electronics', 'Beverages', 'Snacks'];
      const productCats = Array.from(new Set(data.map(p => p.category)));
      const combined = Array.from(new Set([...customCats, ...productCats])).filter(Boolean).sort();
      setCategories(combined);
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
    const isConfirmed = await confirm({
      title: 'Delete Product',
      message: 'Are you sure you want to delete this product? This action cannot be undone.',
      confirmText: 'Delete',
      cancelText: 'Cancel',
      type: 'danger'
    });
    if (!isConfirmed) return;
    try {
      await productApi.delete(id);
      setProducts(prev => {
        const updated = prev.filter(p => p.id !== id);
        cachedProducts = updated;
        return updated;
      });
      toast.success('Product deleted successfully.');
      window.dispatchEvent(new CustomEvent('products_updated'));
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete product.');
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
    setShowNewCatInput(false);
    setNewCatName('');
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
    setShowNewCatInput(false);
    setNewCatName('');
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
    let activeCategory = formCategory;
    if (showNewCatInput && newCatName.trim()) {
      activeCategory = newCatName.trim();
      const saved = localStorage.getItem('product_categories');
      const customCats: string[] = saved ? JSON.parse(saved) : ['General', 'Electronics', 'Beverages', 'Snacks'];
      if (!customCats.includes(activeCategory)) {
        customCats.push(activeCategory);
        localStorage.setItem('product_categories', JSON.stringify(customCats));
      }
    }
    if (!formName || !formSku || !formPrice) {
      setFormError('Name, SKU and Price are required.');
      return;
    }
    if (!activeCategory) {
      setFormError('Please select or specify a category.');
      return;
    }
    const payload = {
      name: formName,
      sku: formSku,
      category: activeCategory,
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
      loadProducts();
      window.dispatchEvent(new CustomEvent('products_updated'));
    } catch (err: any) {
      setFormError(err.message || 'Failed to save product.');
    }
  };
  const formatCurrency = (val: number) => {
    return `Rs. ${Number(val).toFixed(2)}`;
  };
  const filteredGridProducts = products.filter(p => selectedCategoryFilter === 'All' || p.category === selectedCategoryFilter);
  return (
    <>
      <div className="p-6 max-w-6xl mx-auto space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t('productsCatalog')}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {products.length} {t('productsCount')}
          </p>
        </div>
        {(currentUser?.role === 'admin' || currentUser?.role === 'owner') && (
          <button
            onClick={startAddNew}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors cursor-pointer text-sm shadow-md shadow-primary/20"
          >
            <Plus className="w-4 h-4" />
            {t('addProduct')}
          </button>
        )}
      </div>
      <div className="flex border-b border-border/40">
        <button
          onClick={() => setActiveTab('inventory')}
          className={`px-4 py-2 font-medium text-sm transition-colors ${
            activeTab === 'inventory' ? 'text-primary border-b-2 border-primary' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Inventory List
        </button>
        <button
          onClick={() => setActiveTab('presets')}
          className={`px-4 py-2 font-medium text-sm transition-colors ${
            activeTab === 'presets' ? 'text-primary border-b-2 border-primary' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Stock Presets
        </button>
      </div>
      {activeTab === 'inventory' ? (
      <div className="space-y-4 w-full">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <SearchBar
              placeholder={t('searchProducts')}
              onSearch={handleSearch}
            />
          </div>
          <div className="w-full sm:w-64">
            <select
              value={selectedCategoryFilter}
              onChange={(e) => setSelectedCategoryFilter(e.target.value)}
              className="w-full bg-[#0d0e12] border border-border rounded-xl px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all cursor-pointer appearance-none"
              style={{
                backgroundImage: `url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3E%3Cpath stroke='%23888888' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3E%3C/svg%3E")`,
                backgroundPosition: 'right 0.75rem center',
                backgroundSize: '1.25rem',
                backgroundRepeat: 'no-repeat',
                paddingRight: '2.5rem'
              }}
            >
              <option value="All">{t('allCategories')} ({products.length})</option>
              {categories.map(cat => {
                const count = products.filter(p => p.category === cat).length;
                return (
                  <option key={cat} value={cat}>
                    {cat} ({count})
                  </option>
                );
              })}
            </select>
          </div>
        </div>
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          </div>
        ) : filteredGridProducts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground border border-border/30 rounded-2xl bg-card/10 text-center">
            <Package className="w-12 h-12 mb-4 opacity-30" />
            <p className="text-base font-medium">
              {searchQuery ? 'No matching products found' : 'No products in this category yet'}
            </p>
            <p className="text-sm mt-1">
              {searchQuery ? 'Try another search query' : 'Add products to begin checkout'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredGridProducts.map(prod => (
              <div
                key={prod.id}
                onClick={() => (currentUser?.role === 'admin' || currentUser?.role === 'owner') && startEdit(prod)}
                className={`glass-card p-5 border border-border/40 rounded-2xl bg-card/30 flex flex-col justify-between hover:bg-card/60 transition-all hover:scale-[1.01] hover:border-primary/20 ${
                  (currentUser?.role === 'admin' || currentUser?.role === 'owner') ? 'cursor-pointer select-none' : ''
                }`}
              >
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
                      <p className="text-[10px] text-muted-foreground">{t('price')}</p>
                      <p className="font-bold text-sm text-primary">{formatCurrency(prod.price)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground">{t('stockQuantity')}</p>
                      <p className={`font-semibold text-sm ${prod.stock === -1 ? 'text-emerald-400' : (prod.stock < 5 ? 'text-destructive font-bold animate-pulse' : 'text-foreground')}`}>
                        {prod.stock === -1 ? 'Unlimited' : `${prod.stock} units`}
                      </p>
                    </div>
                    {(currentUser?.role === 'admin' || currentUser?.role === 'owner') && (
                      <div>
                        <p className="text-[10px] text-muted-foreground">Cost</p>
                        <p className="font-medium text-sm text-muted-foreground">{formatCurrency(prod.cost)}</p>
                      </div>
                    )}
                    {prod.lastStockUpdatedBy && (
                      <div className="hidden xl:block">
                        <p className="text-[10px] text-muted-foreground">Last Stock Update</p>
                        <p className="font-medium text-[11px] text-muted-foreground" title={prod.lastStockUpdatedAt ? new Date(prod.lastStockUpdatedAt).toLocaleString() : ''}>
                          {prod.lastStockUpdatedBy}
                        </p>
                      </div>
                    )}
                  </div>
                  {(currentUser?.role === 'admin' || currentUser?.role === 'owner') && (
                    <div className="flex gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          startEdit(prod);
                        }}
                        className="p-2 rounded-lg bg-secondary/80 hover:bg-primary/20 hover:text-primary text-muted-foreground transition-all cursor-pointer"
                        title="Edit Product"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(prod.id);
                        }}
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
      ) : (
        <StockPresetsTab currentUser={currentUser} />
      )}
      </div>
      {isEditing && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-start justify-center p-4 overflow-y-auto md:py-12 animate-fade-in">
          <form onSubmit={saveProduct} className="glass-card w-full max-w-3xl bg-card border border-border rounded-2xl shadow-xl p-6 animate-scale-in space-y-4 my-8">
            <div className="flex justify-between items-center pb-3 border-b border-border/40">
              <h3 className="text-lg font-bold text-foreground">
                {isEditing === 'new' ? 'Add New Product' : 'Edit Product'}
              </h3>
              <button type="button" onClick={cancelEdit} className="p-1 text-muted-foreground hover:text-foreground cursor-pointer rounded-lg hover:bg-secondary">
                <X className="w-5 h-5" />
              </button>
            </div>
            {formError && <p className="text-xs text-destructive bg-destructive/10 p-2.5 rounded-lg font-medium">{formError}</p>}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4 w-full">
                <div>
                  <label className="text-xs text-muted-foreground font-semibold mb-1 block">Product Name *</label>
                  <input
                    type="text"
                    value={formName}
                    onChange={e => setFormName(e.target.value)}
                    className="w-full bg-secondary/40 border border-border/50 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary text-foreground"
                    placeholder="Product Name"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground font-semibold mb-1 block">Image URL</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={formImageUrl}
                      onChange={e => setFormImageUrl(e.target.value)}
                      className="flex-1 min-w-0 bg-secondary/40 border border-border/50 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary text-foreground"
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
                <div>
                  <label className="text-xs text-muted-foreground font-semibold mb-1 block">Description</label>
                  <textarea
                    value={formDescription}
                    onChange={e => setFormDescription(e.target.value)}
                    className="w-full bg-secondary/40 border border-border/50 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary h-[88px] resize-none text-foreground"
                    placeholder="Product notes and specs..."
                  />
                </div>
              </div>
              <div className="space-y-4 w-full">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-muted-foreground font-semibold mb-1 block">SKU / Barcode *</label>
                    <input
                      type="text"
                      value={formSku}
                      onChange={e => setFormSku(e.target.value)}
                      className="w-full bg-secondary/40 border border-border/50 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary text-foreground"
                      placeholder="SKU-Code"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground font-semibold mb-1 block">Category *</label>
                    <select
                      value={showNewCatInput ? '__new__' : formCategory}
                      onChange={e => {
                        const val = e.target.value;
                        if (val === '__new__') {
                          setShowNewCatInput(true);
                          setFormCategory('');
                        } else {
                          setShowNewCatInput(false);
                          setFormCategory(val);
                        }
                      }}
                      className="w-full bg-secondary/40 border border-border/50 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary text-foreground"
                    >
                      <option value="">-- Select Category --</option>
                      {categories.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                      {(currentUser?.role === 'admin' || currentUser?.role === 'owner') && (
                        <option value="__new__" className="text-primary font-semibold">+ Create New...</option>
                      )}
                    </select>
                  </div>
                </div>
                {showNewCatInput && (
                  <div className="animate-fade-in">
                    <label className="text-xs text-muted-foreground font-semibold mb-1 block">New Category Name *</label>
                    <input
                      type="text"
                      value={newCatName}
                      onChange={e => {
                        setNewCatName(e.target.value);
                      }}
                      placeholder="New category name..."
                      className="w-full bg-secondary/40 border border-border/50 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary text-foreground"
                    />
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-muted-foreground font-semibold mb-1 block">Price (LKR) *</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formPrice}
                      onChange={e => setFormPrice(e.target.value)}
                      className="w-full bg-secondary/40 border border-border/50 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary text-foreground"
                      placeholder="Price"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground font-semibold mb-1 block">Cost (LKR)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formCost}
                      onChange={e => setFormCost(e.target.value)}
                      className="w-full bg-secondary/40 border border-border/50 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary text-foreground"
                      placeholder="Cost"
                    />
                  </div>
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
                    className="w-full bg-secondary/40 border border-border/50 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary disabled:opacity-40 transition-all text-foreground"
                    placeholder={formTrackStock ? "Stock count" : "Unlimited stock"}
                  />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-3 border-t border-border/40">
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
      )}
    </>
  );
}
