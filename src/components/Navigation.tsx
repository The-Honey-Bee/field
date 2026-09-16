import React from 'react';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  ShoppingCart,
  FileText,
  ShieldCheck,
  BarChart3,
  Users,
  MessageSquare,
  History,
  User,
} from 'lucide-react';

interface NavigationProps {
  currentView: string;
  onNavigate: (view: string) => void;
}

export const Navigation: React.FC<NavigationProps> = ({ currentView, onNavigate }) => {
  const { isSupervisor, isManager } = useAuth();

  const navItems = [
    { id: 'home', label: 'Home', icon: LayoutDashboard },
    { id: 'orders', label: 'New Order', icon: ShoppingCart },
    { id: 'reports', label: 'EOD Report', icon: FileText },
    ...(isSupervisor ? [{ id: 'supervisor', label: 'Supervisor', icon: ShieldCheck }] : []),
    ...(isManager || isSupervisor ? [{ id: 'analytics', label: 'Analytics', icon: BarChart3 }] : []),
    { id: 'customers', label: 'Customers', icon: Users },
    { id: 'messages', label: 'Chat', icon: MessageSquare },
    { id: 'activity', label: 'Logs', icon: History },
    { id: 'account', label: 'Account', icon: User },
  ];

  return (
    <>
      {/* Desktop Sub-navigation Header */}
      <div className="hidden md:block bg-[#0D1E12] border-b border-[#243447]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-1 overflow-x-auto py-2 scrollbar-none">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentView === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onNavigate(item.id)}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
                    isActive
                      ? 'bg-[#006B3C] text-white shadow-sm'
                      : 'text-[#8899AA] hover:text-white hover:bg-[#122010]'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-[#00C46A]' : ''}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Mobile Bottom Navigation Bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#0A1A0F]/95 backdrop-blur-lg border-t border-[#243447] safe-area-pb">
        <div className="grid grid-cols-5 h-16 items-center px-1">
          {/* Main 5 mobile quick items */}
          <button
            onClick={() => onNavigate('home')}
            className={`flex flex-col items-center justify-center h-full text-center transition-colors ${
              currentView === 'home' ? 'text-[#00C46A]' : 'text-[#8899AA]'
            }`}
          >
            <LayoutDashboard className="w-5 h-5 mb-0.5" />
            <span className="text-[10px] font-medium tracking-tight">Home</span>
          </button>

          <button
            onClick={() => onNavigate('orders')}
            className={`flex flex-col items-center justify-center h-full text-center transition-colors ${
              currentView === 'orders' ? 'text-[#00C46A]' : 'text-[#8899AA]'
            }`}
          >
            <div className="relative">
              <ShoppingCart className="w-5 h-5 mb-0.5" />
            </div>
            <span className="text-[10px] font-medium tracking-tight">Order</span>
          </button>

          <button
            onClick={() => onNavigate('reports')}
            className={`flex flex-col items-center justify-center h-full text-center transition-colors ${
              currentView === 'reports' ? 'text-[#00C46A]' : 'text-[#8899AA]'
            }`}
          >
            <FileText className="w-5 h-5 mb-0.5" />
            <span className="text-[10px] font-medium tracking-tight">EOD</span>
          </button>

          {isSupervisor ? (
            <button
              onClick={() => onNavigate('supervisor')}
              className={`flex flex-col items-center justify-center h-full text-center transition-colors ${
                currentView === 'supervisor' ? 'text-[#00C46A]' : 'text-[#8899AA]'
              }`}
            >
              <ShieldCheck className="w-5 h-5 mb-0.5" />
              <span className="text-[10px] font-medium tracking-tight">Supervise</span>
            </button>
          ) : (
            <button
              onClick={() => onNavigate('customers')}
              className={`flex flex-col items-center justify-center h-full text-center transition-colors ${
                currentView === 'customers' ? 'text-[#00C46A]' : 'text-[#8899AA]'
              }`}
            >
              <Users className="w-5 h-5 mb-0.5" />
              <span className="text-[10px] font-medium tracking-tight">Clients</span>
            </button>
          )}

          <button
            onClick={() => onNavigate('messages')}
            className={`flex flex-col items-center justify-center h-full text-center transition-colors ${
              currentView === 'messages' ? 'text-[#00C46A]' : 'text-[#8899AA]'
            }`}
          >
            <MessageSquare className="w-5 h-5 mb-0.5" />
            <span className="text-[10px] font-medium tracking-tight">Chat</span>
          </button>
        </div>
      </div>
    </>
  );
};
