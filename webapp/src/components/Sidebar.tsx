import { useState } from 'react';
import {
  LayoutDashboard,
  Package,
  Receipt,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Shield,
  Settings,
  Database,
  Activity,
} from 'lucide-react';
import type { User } from '@/lib/api';
import Logo from './Logo';
import { useTranslation } from '@/lib/translations';
import SyncBadge from './SyncBadge';

export type Page = 'dashboard' | 'products' | 'checkout' | 'transactions' | 'reports' | 'admin' | 'settings' | 'maintenance' | 'activity';

interface SidebarProps {
  currentPage: Page;
  onNavigate: (page: Page) => void;
  currentUser: User | null;
  onLogout: () => void;
}

const navItems: { page: Page; label: string; icon: React.ElementType; role?: 'admin' | 'user' }[] = [
  { page: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { page: 'admin', label: 'User Panel', icon: Shield, role: 'admin' },
  { page: 'products', label: 'Products Catalog', icon: Package },
  { page: 'transactions', label: 'Transactions Log', icon: Receipt, role: 'user' },
  { page: 'reports', label: 'Sales Reports', icon: BarChart3 },
  { page: 'settings', label: 'System Settings', icon: Settings, role: 'admin' },
  { page: 'maintenance', label: 'Database Maintenance', icon: Database, role: 'admin' },
  { page: 'activity', label: 'System Activity', icon: Activity, role: 'admin' },
];

export default function Sidebar({ currentPage, onNavigate, currentUser, onLogout }: SidebarProps) {
  const { t } = useTranslation();
  const [collapsed, setCollapsed] = useState(false);

  const getNavLabel = (page: Page) => {
    switch (page) {
      case 'dashboard': return t('dashboard');
      case 'admin': return t('userPanel');
      case 'products': return t('productsCatalog');
      case 'transactions': return t('transactionsLog');
      case 'reports': return t('salesReports');
      case 'settings': return t('systemSettings');
      case 'maintenance': return t('databaseMaintenance');
      case 'activity': return 'System Activity'; // Might need translation in the future
      default: return page;
    }
  };

  const filteredNav = navItems.filter((item) => {
    if (!item.role) return true;
    const isAdminOrOwner = currentUser?.role === 'admin' || currentUser?.role === 'owner';
    if (item.role === 'admin') return isAdminOrOwner;
    if (item.role === 'user') return !isAdminOrOwner;
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
              title={collapsed ? getNavLabel(item.page) : undefined}
            >
              <Icon className={`w-[18px] h-[18px] flex-shrink-0 ${isActive ? 'text-primary' : ''}`} />
              {!collapsed && <span>{getNavLabel(item.page)}</span>}
            </button>
          );
        })}
      </nav>

      {/* Sync Status Badge */}
      <div className="px-2 py-1.5 flex-shrink-0 border-t border-sidebar-border">
        <SyncBadge collapsed={collapsed} />
      </div>

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
                    {currentUser.role === 'admin' ? t('systemAdmin') : (currentUser.role === 'owner' ? t('owner') : t('cashier'))}
                  </p>
                </div>
              )}
            </div>
            {!collapsed && (
              <button
                onClick={onLogout}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer flex-shrink-0"
                title={t('logout')}
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          {collapsed && (
            <button
              onClick={onLogout}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
              title={t('logout')}
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
