import { useState } from 'react';
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Receipt,
  GitBranch,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Shield,
} from 'lucide-react';
import type { User } from '@/lib/api';
import Logo from './Logo';

export type Page = 'dashboard' | 'products' | 'checkout' | 'transactions' | 'graph' | 'reports' | 'admin';

interface SidebarProps {
  currentPage: Page;
  onNavigate: (page: Page) => void;
  currentUser: User | null;
  onLogout: () => void;
}

const navItems: { page: Page; label: string; icon: React.ElementType; role?: 'admin' | 'user' }[] = [
  { page: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { page: 'admin', label: 'Admin Panel', icon: Shield, role: 'admin' },
  { page: 'products', label: 'Products Catalog', icon: Package },
  { page: 'checkout', label: 'Checkout Register', icon: ShoppingCart },
  { page: 'transactions', label: 'Transactions Log', icon: Receipt },
  { page: 'graph', label: 'Recommendation Net', icon: GitBranch },
  { page: 'reports', label: 'Sales Reports', icon: BarChart3 },
];

export default function Sidebar({ currentPage, onNavigate, currentUser, onLogout }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);

  const filteredNav = navItems.filter((item) => {
    if (!item.role) return true;
    if (item.role === 'admin') return currentUser?.role === 'admin';
    if (item.role === 'user') return currentUser?.role !== 'admin';
    return true;
  });

  return (
    <aside
      className={`flex flex-col h-screen bg-sidebar border-r border-sidebar-border transition-all duration-300 ${
        collapsed ? 'w-[68px]' : 'w-[220px]'
      }`}
    >
      {/* Logo */}
      <div
        className={`flex items-center flex-shrink-0 transition-all duration-300 ${
          collapsed
            ? 'h-0 opacity-0 overflow-hidden border-b-0'
            : 'h-16 px-5 border-b border-sidebar-border'
        }`}
      >
        <Logo
          collapsed={collapsed}
          className="text-foreground h-12 w-auto transition-all duration-300"
        />
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
        {filteredNav.map((item) => {
          const isActive = currentPage === item.page;
          const Icon = item.icon;
          return (
            <button
              key={item.page}
              onClick={() => onNavigate(item.page)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer
                ${
                  isActive
                    ? 'bg-primary/12 text-primary shadow-sm'
                    : 'text-muted-foreground hover:text-foreground hover:bg-secondary/60'
                }
              `}
              title={collapsed ? item.label : undefined}
            >
              <Icon className={`w-[18px] h-[18px] flex-shrink-0 ${isActive ? 'text-primary' : ''}`} />
              {!collapsed && <span>{item.label}</span>}
            </button>
          );
        })}
      </nav>

      {/* User profile / Logout */}
      {currentUser && (
        <div className="p-2 border-t border-sidebar-border flex-shrink-0 flex flex-col gap-2 items-center">
          <div className="flex items-center gap-2 w-full px-2 min-w-0 justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-7 h-7 rounded-full bg-primary/15 border border-primary/25 flex items-center justify-center flex-shrink-0 font-semibold text-primary text-xs uppercase">
                {currentUser.username[0]}
              </div>
              {!collapsed && (
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-foreground truncate leading-none mb-0.5">{currentUser.username}</p>
                  <p className="text-[9px] text-muted-foreground truncate leading-none">
                    {currentUser.role === 'admin' ? 'System Admin' : 'Cashier'}
                  </p>
                </div>
              )}
            </div>
            {!collapsed && (
              <button
                onClick={onLogout}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer flex-shrink-0"
                title="Log Out"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          {collapsed && (
            <button
              onClick={onLogout}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
              title="Log Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      )}

      {/* Collapse Toggle */}
      <div className="p-2 border-t border-sidebar-border flex-shrink-0">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="w-full flex items-center justify-center py-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors cursor-pointer"
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>
    </aside>
  );
}
