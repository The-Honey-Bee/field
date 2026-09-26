import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { LanguageProvider } from './context/LanguageContext';
import { Navbar, openSidebarMenu } from './components/Navbar';
import {
  Navigation,
  SupervisorNavigation,
  DispatcherNavigation,
  ManagerNavigation,
  FieldStaffNavigation,
} from './components/Navigation';
import { OfflineSyncBanner } from './components/OfflineSyncBanner';
import { OfflineSyncModal } from './components/OfflineSyncModal';
import { HomeScreen } from './screens/HomeScreen';
import { SupervisorHomeScreen } from './screens/SupervisorHomeScreen';
import { DispatcherHomeScreen } from './screens/DispatcherHomeScreen';
import { ManagerHomeScreen } from './screens/ManagerHomeScreen';
import { OrderPaymentScreen } from './screens/OrderPaymentScreen';
import { EodReportScreen } from './screens/EodReportScreen';
import { SupervisorScreen } from './screens/SupervisorScreen';
import { ManagerAnalyticsScreen } from './screens/ManagerAnalyticsScreen';
import { CustomerManagementScreen } from './screens/CustomerManagementScreen';
import { DirectMessagingScreen } from './screens/DirectMessagingScreen';
import { ActivityLogScreen } from './screens/ActivityLogScreen';
import { AccountManagementScreen } from './screens/AccountManagementScreen';
import { GoogleFormsScreen } from './screens/GoogleFormsScreen';
import { AuthScreen } from './screens/AuthScreen';

const AppContent: React.FC = () => {
  const { user, role, loading } = useAuth();
  const [currentView, setCurrentView] = useState<string>('home');
  const [showSyncModal, setShowSyncModal] = useState<boolean>(false);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A1A0F] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-[#00C46A] border-t-transparent rounded-full animate-spin" />
          <span className="text-xs text-[#8899AA] font-mono">Initializing Zamzam Field...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return <AuthScreen />;
  }

  // Dynamic Navigation Component based on Role from AuthContext
  const renderRoleNavigation = () => {
    switch (role) {
      case 'supervisor':
        return <SupervisorNavigation currentView={currentView} onNavigate={setCurrentView} />;
      case 'dispatcher':
        return <DispatcherNavigation currentView={currentView} onNavigate={setCurrentView} />;
      case 'manager':
        return <ManagerNavigation currentView={currentView} onNavigate={setCurrentView} />;
      case 'field_staff':
      default:
        return <FieldStaffNavigation currentView={currentView} onNavigate={setCurrentView} />;
    }
  };

  // Dynamic Home Screen Component based on Role from AuthContext
  const renderRoleHomeScreen = () => {
    switch (role) {
      case 'supervisor':
        return <SupervisorHomeScreen onNavigate={setCurrentView} />;
      case 'dispatcher':
        return <DispatcherHomeScreen onNavigate={setCurrentView} />;
      case 'manager':
        return <ManagerHomeScreen onNavigate={setCurrentView} />;
      case 'field_staff':
      default:
        return <HomeScreen onNavigate={setCurrentView} />;
    }
  };

  const renderCurrentView = () => {
    switch (currentView) {
      case 'home':
        return renderRoleHomeScreen();
      case 'orders':
        return <OrderPaymentScreen onNavigate={setCurrentView} />;
      case 'reports':
        return <EodReportScreen onNavigate={setCurrentView} />;
      case 'forms':
        return <GoogleFormsScreen onNavigate={setCurrentView} />;
      case 'supervisor':
        return <SupervisorScreen onNavigate={setCurrentView} />;
      case 'analytics':
        return <ManagerAnalyticsScreen onNavigate={setCurrentView} />;
      case 'customers':
        return <CustomerManagementScreen onNavigate={setCurrentView} />;
      case 'messages':
        return <DirectMessagingScreen onNavigate={setCurrentView} />;
      case 'activity':
        return <ActivityLogScreen onNavigate={setCurrentView} />;
      case 'account':
        return <AccountManagementScreen onNavigate={setCurrentView} />;
      case 'menu':
        openSidebarMenu();
        return renderRoleHomeScreen();
      default:
        return renderRoleHomeScreen();
    }
  };

  return (
    <div className="min-h-screen bg-[#0A1A0F] text-[#D0E8F0] flex flex-col font-sans selection:bg-[#00C46A] selection:text-[#0A1A0F]">
      <Navbar currentView={currentView} onNavigate={setCurrentView} />
      <OfflineSyncBanner onOpenSyncCenter={() => setShowSyncModal(true)} />
      {renderRoleNavigation()}

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        {renderCurrentView()}
      </main>

      <OfflineSyncModal isOpen={showSyncModal} onClose={() => setShowSyncModal(false)} />
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
};

export default App;
