import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Package, Plus, Play, Trash2, X } from 'lucide-react';
import { inventoryApi, productApi, StockPresetRecord, ProductRecord } from '@/lib/api';
import { useNotification } from '@/context/NotificationContext';
import SearchBar from './SearchBar';

export function StockPresetsTab({ currentUser }: { currentUser: any }) {
  const { toast, confirm } = useNotification();
  const [presets, setPresets] = useState<StockPresetRecord[]>([]);
  const [products, setProducts] = useState<ProductRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [presetName, setPresetName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItems, setSelectedItems] = useState<{ productId: string; qty: number }[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [presetsData, productsData] = await Promise.all([
        inventoryApi.getPresets(),
        productApi.getAll()
      ]);
      setPresets(presetsData);
      setProducts(productsData);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load presets or products');
    } finally {
      setLoading(false);
    }
  }

  const handleCreatePreset = async () => {
    if (!presetName.trim()) return toast.error('Please enter a preset name');
    if (selectedItems.length === 0) return toast.error('Please select at least one product');

    try {
      await inventoryApi.createPreset({ name: presetName, items: selectedItems });
      toast.success('Preset saved successfully');
      setIsModalOpen(false);
      setPresetName('');
      setSelectedItems([]);
      loadData();
    } catch (err) {
      toast.error('Failed to save preset');
    }
  };

  const handleApplyPreset = async (presetId: string) => {
    const isConfirmed = await confirm({
      title: 'Apply Preset',
      message: 'This will overwrite the stock quantity for all products in this preset. Proceed?',
      confirmText: 'Apply',
      cancelText: 'Cancel'
    });
    if (!isConfirmed) return;

    try {
      await inventoryApi.applyPreset(presetId, { updatedBy: currentUser?.username || currentUser?.role || 'Unknown' });
      toast.success('Stock updated successfully');
      // Broadcast an event so ProductsPage list will reload
      window.dispatchEvent(new CustomEvent('products_updated'));
    } catch (err) {
      toast.error('Failed to apply preset');
    }
  };

  const handleDeletePreset = async (presetId: string) => {
    const isConfirmed = await confirm({
      title: 'Delete Preset',
      message: 'Are you sure you want to delete this preset?',
      confirmText: 'Delete',
      cancelText: 'Cancel',
      type: 'danger'
    });
    if (!isConfirmed) return;

    try {
      await inventoryApi.deletePreset(presetId);
      toast.success('Preset deleted');
      loadData();
    } catch (err) {
      toast.error('Failed to delete preset');
    }
  };

  const toggleProductSelection = (productId: string) => {
    if (selectedItems.find(i => i.productId === productId)) {
      setSelectedItems(selectedItems.filter(i => i.productId !== productId));
    } else {
      setSelectedItems([...selectedItems, { productId, qty: 0 }]);
    }
  };

  const updateProductQty = (productId: string, qty: number) => {
    setSelectedItems(selectedItems.map(i => i.productId === productId ? { ...i, qty } : i));
  };

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    p.sku.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground">Stock Presets</h2>
          <p className="text-sm text-muted-foreground mt-1">Create bulk stock update presets for quickly updating inventory.</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center space-x-2 bg-primary/20 text-primary hover:bg-primary/30 px-4 py-2 rounded-xl transition-all"
        >
          <Plus size={18} />
          <span>New Preset</span>
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : presets.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 text-center border border-dashed border-border/50 rounded-2xl bg-card/20">
          <Package className="w-12 h-12 text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-medium text-foreground">No Presets Found</h3>
          <p className="text-sm text-muted-foreground mt-1 mb-4">Create your first stock preset to manage inventory in bulk.</p>
          <button onClick={() => setIsModalOpen(true)} className="px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-semibold rounded-lg flex items-center justify-center cursor-pointer transition-colors select-none">
            Create Preset
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {presets.map(preset => (
            <div key={preset._id} className="glass-card rounded-2xl p-5 border border-border/30 hover:border-primary/30 transition-all flex flex-col h-full">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-lg font-semibold text-foreground">{preset.name}</h3>
                <span className="text-xs font-medium px-2 py-1 bg-secondary/50 text-secondary-foreground rounded-full">
                  {preset.items.length} items
                </span>
              </div>
              <div className="flex-1 overflow-y-auto max-h-32 mb-4 space-y-1">
                {preset.items.map(item => {
                  const p = products.find(prod => prod.id === item.productId);
                  return (
                    <div key={item.productId} className="flex justify-between text-sm">
                      <span className="text-muted-foreground truncate pr-2">{p ? p.name : 'Unknown Product'}</span>
                      <span className="font-mono text-foreground font-medium">{item.qty}</span>
                    </div>
                  );
                })}
              </div>
              <div className="flex justify-between items-center pt-4 border-t border-border/30 mt-auto">
                <button
                  onClick={() => handleDeletePreset(preset._id)}
                  className="p-2 text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                  title="Delete Preset"
                >
                  <Trash2 size={18} />
                </button>
                <button
                  onClick={() => handleApplyPreset(preset._id)}
                  className="flex items-center space-x-2 bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 px-4 py-2 rounded-xl transition-all"
                >
                  <Play size={16} className="fill-current" />
                  <span className="font-medium">Apply Stock</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {isModalOpen && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
          <div className="w-full max-w-2xl bg-card border border-border/50 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-4 border-b border-border/30">
              <h3 className="text-lg font-semibold text-foreground">Create Bulk Stock Preset</h3>
              <button onClick={() => setIsModalOpen(false)} className="p-2 text-muted-foreground hover:text-foreground rounded-full hover:bg-secondary/50 transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-4 border-b border-border/30">
              <label className="block text-sm font-medium text-foreground mb-1">Preset Name</label>
              <input
                type="text"
                value={presetName}
                onChange={e => setPresetName(e.target.value)}
                placeholder="e.g., Weekly Restock, Pallet A"
                className="w-full bg-secondary/40 border border-border/50 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary text-foreground"
              />
            </div>

            <div className="p-4 border-b border-border/30 bg-secondary/10">
              <SearchBar onSearch={setSearchQuery} placeholder="Search products to add..." />
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-2 min-h-0">
              {filteredProducts.map(product => {
                const isSelected = selectedItems.find(i => i.productId === product.id);
                return (
                  <div key={product.id} className={`flex items-center justify-between p-3 rounded-xl border transition-all ${isSelected ? 'bg-primary/5 border-primary/30' : 'bg-card border-border/30 hover:border-border/60'}`}>
                    <div className="flex items-center space-x-3 flex-1 min-w-0">
                      <input
                        type="checkbox"
                        checked={!!isSelected}
                        onChange={() => toggleProductSelection(product.id)}
                        className="w-4 h-4 rounded border-border/50 text-primary focus:ring-primary/50 bg-background"
                      />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{product.name}</p>
                        <p className="text-xs text-muted-foreground">{product.sku}</p>
                      </div>
                    </div>
                    {isSelected && (
                      <div className="flex items-center space-x-2 pl-4">
                        <span className="text-xs text-muted-foreground">Qty:</span>
                        <input
                          type="number"
                          min="0"
                          value={isSelected.qty}
                          onChange={e => updateProductQty(product.id, parseInt(e.target.value) || 0)}
                          className="w-20 px-2 py-1 text-sm bg-background border border-border/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground"
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="p-4 border-t border-border/30 bg-card/50 flex justify-end space-x-3">
              <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                Cancel
              </button>
              <button onClick={handleCreatePreset} className="px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-semibold rounded-lg flex items-center justify-center cursor-pointer transition-colors select-none">
                Save Preset ({selectedItems.length} items)
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

export default StockPresetsTab;
