import { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import type { Page } from '@/components/Sidebar';
import DashboardPage from '@/pages/DashboardPage';
import ErrorsPage from '@/pages/ErrorsPage';
import AddErrorPage from '@/pages/AddErrorPage';
import SolutionsPage from '@/pages/SolutionsPage';
import GraphPage from '@/pages/GraphPage';
import ReportsPage from '@/pages/ReportsPage';
import LoginPage from '@/pages/LoginPage';
import AdminPage from '@/pages/AdminPage';
import type { User } from '@/lib/api';
import DarkVeil from '@/components/DarkVeil';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [currentPage, setCurrentPage] = useState<Page>('dashboard');

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const saved = localStorage.getItem('currentUser');
        if (saved) {
          const parsed = JSON.parse(saved);
          // Ping the backend to ensure it's up before auto-logging in
          const res = await fetch('http://localhost:3000/');
          if (res.ok) {
            setCurrentUser(parsed);
            setCurrentPage(parsed.role === 'admin' ? 'admin' : 'dashboard');
          } else {
            localStorage.removeItem('currentUser');
          }
        }
      } catch (e) {
        localStorage.removeItem('currentUser');
      } finally {
        setIsInitializing(false);
      }
    };
    checkAuth();
  }, []);

  const handleLoginSuccess = (user: User) => {
    setCurrentUser(user);
    localStorage.setItem('currentUser', JSON.stringify(user));
    setCurrentPage(user.role === 'admin' ? 'admin' : 'dashboard');
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('currentUser');
  };

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <DashboardPage />;
      case 'products':
        return <ErrorsPage currentUser={currentUser} />;
      case 'checkout':
        return <AddErrorPage currentUser={currentUser} onSuccess={() => {}} />;
      case 'transactions':
        return <SolutionsPage currentUser={currentUser} />;
      case 'graph':
        return <GraphPage />;
      case 'reports':
        return <ReportsPage />;
      case 'admin':
        return <AdminPage />;
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
  );
}
