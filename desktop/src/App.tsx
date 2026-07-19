import { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import type { Page } from '@/components/Sidebar';
import DashboardPage from '@/pages/DashboardPage';
import ProductsPage from '@/pages/ProductsPage';
import CheckoutPage from '@/pages/CheckoutPage';
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

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [currentPage, setCurrentPage] = useState<Page>('dashboard');

  useEffect(() => {
    const stopWS = startWebSocketListener();
    return () => {
      stopWS();
    };
  }, []);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const saved = localStorage.getItem('currentUser') || sessionStorage.getItem('currentUser');
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
    setCurrentUser(user);
    if (rememberMe) {
      localStorage.setItem('currentUser', JSON.stringify(user));
      localStorage.setItem('rememberMePreference', 'true');
    } else {
      localStorage.removeItem('currentUser');
      sessionStorage.setItem('currentUser', JSON.stringify(user));
      localStorage.setItem('rememberMePreference', 'false');
    }
    setCurrentPage('dashboard');
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('currentUser');
    sessionStorage.removeItem('currentUser');
  };

  const renderPage = () => {
    const isAdminOrOwner = currentUser?.role === 'admin' || currentUser?.role === 'owner';
    switch (currentPage) {
      case 'dashboard':
        return <DashboardPage />;
      case 'products':
        return <ProductsPage currentUser={currentUser} />;
      case 'checkout':
        return <CheckoutPage currentUser={currentUser} onSuccess={() => {}} />;
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
      <div className="flex w-full h-full relative z-10">
        <Sidebar
          currentPage={currentPage}
          onNavigate={setCurrentPage}
          currentUser={currentUser}
          onLogout={handleLogout}
        />
        <main className="flex-1 overflow-y-auto">
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
