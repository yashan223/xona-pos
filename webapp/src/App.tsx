import { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import type { Page } from '@/components/Sidebar';
import DashboardPage from '@/pages/DashboardPage';
import ProductsPage from '@/pages/ProductsPage';
import SolutionsPage from '@/pages/SolutionsPage';
import ReportsPage from '@/pages/ReportsPage';
import LoginPage from '@/pages/LoginPage';
import AdminPage from '@/pages/AdminPage';
import SettingsPage from '@/pages/SettingsPage';
import MaintenancePage from '@/pages/MaintenancePage';
import ActivityPage from '@/pages/ActivityPage';
import type { User } from '@/lib/api';
import DarkVeil from '@/components/DarkVeil';
import { startWebSocketListener } from '@/lib/websocket';
import { NotificationProvider } from '@/context/NotificationContext';
import { Menu, X } from 'lucide-react';
import Logo from '@/components/Logo';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [currentPage, setCurrentPage] = useState<Page>('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const stopWS = startWebSocketListener();
    return () => {
      stopWS();
    };
  }, []);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const saved = localStorage.getItem('currentUser');
        if (saved) {
          const parsed = JSON.parse(saved);
          setCurrentUser(parsed);
          setCurrentPage('dashboard');
        }
      } catch (e) {
        // ignore JSON parse error
      } finally {
        setIsInitializing(false);
      }
    };
    checkAuth();
  }, []);

  const handleLoginSuccess = (user: User, rememberMe: boolean) => {
    if (user.role !== 'admin' && user.role !== 'owner') {
      throw new Error('Access Denied: Only Admin or Owner accounts can access the Web Management Portal.');
    }
    setCurrentUser(user);
    if (rememberMe) {
      localStorage.setItem('currentUser', JSON.stringify(user));
      localStorage.setItem('rememberMePreference', 'true');
    } else {
      localStorage.removeItem('currentUser');
      localStorage.setItem('rememberMePreference', 'false');
    }
    setCurrentPage('dashboard');
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('currentUser');
  };

  const renderPage = () => {
    const isAdminOrOwner = currentUser?.role === 'admin' || currentUser?.role === 'owner';
    switch (currentPage) {
      case 'dashboard':
        return <DashboardPage />;
      case 'products':
        return <ProductsPage currentUser={currentUser} />;
      case 'transactions':
        return <SolutionsPage currentUser={currentUser} />;
      case 'reports':
        return <ReportsPage currentUser={currentUser} />;
      case 'settings':
        if (!isAdminOrOwner) return <DashboardPage />;
        return <SettingsPage />;
      case 'maintenance':
        if (!isAdminOrOwner) return <DashboardPage />;
        return <MaintenancePage />;
      case 'admin':
        if (!isAdminOrOwner) return <DashboardPage />;
        return <AdminPage />;
      case 'activity':
        if (!isAdminOrOwner) return <DashboardPage />;
        return <ActivityPage currentUser={currentUser} />;
      default:
        return <DashboardPage />;
    }
  };

  const renderContent = () => {
    if (isInitializing) {
      return <div className="flex w-full h-full items-center justify-center text-foreground/50">Initializing...</div>;
    }

    if (!currentUser) {
      return (
        <LoginPage
          onLoginSuccess={handleLoginSuccess}
        />
      );
    }

    return (
      <div className="flex w-full h-full relative z-10 flex-col md:flex-row">
        {/* Mobile Header */}
        <div className="md:hidden flex items-center justify-between p-4 border-b border-border/40 bg-background/95 backdrop-blur-sm z-30 flex-shrink-0">
          <Logo className="h-8 w-auto text-foreground" collapsed={false} />
          <button 
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 -mr-2 text-foreground hover:bg-secondary/60 rounded-lg transition-colors cursor-pointer"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Sidebar Overlay */}
        {mobileMenuOpen && (
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden" 
            onClick={() => setMobileMenuOpen(false)} 
          />
        )}

        {/* Sidebar Container */}
        <div className={`fixed inset-y-0 left-0 z-50 transform ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} md:relative md:translate-x-0 transition-transform duration-300 ease-in-out`}>
          <Sidebar
            currentPage={currentPage}
            onNavigate={(page) => {
              setCurrentPage(page);
              setMobileMenuOpen(false);
            }}
            currentUser={currentUser}
            onLogout={handleLogout}
          />
        </div>

        <main className="flex-1 min-h-0 min-w-0 overflow-y-auto w-full md:w-auto relative z-10">
          {renderPage()}
        </main>
      </div>
    );
  };

  return (
    <NotificationProvider>
      <div className="relative w-screen h-screen overflow-hidden bg-background text-foreground z-10 flex">
        {/* DarkVeil Background */}
        <div className="absolute inset-0 -z-10 pointer-events-none overflow-hidden" style={{ width: '100%', height: '100%', opacity: 0.65 }}>
          <DarkVeil
            hueShift={0}
            noiseIntensity={0}
            scanlineIntensity={0}
            speed={0.5}
            scanlineFrequency={0}
            warpAmount={0}
            resolutionScale={1}
          />
        </div>
        {renderContent()}
      </div>
    </NotificationProvider>
  );
}
