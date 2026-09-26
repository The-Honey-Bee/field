import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
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
  ClipboardList,
  Truck,
  TrendingUp,
  MapPin,
  Sparkles,
} from 'lucide-react';

export interface NavigationProps {
  currentView: string;
  onNavigate: (view: string) => void;
}

// Supervisor Navigation: live map, order authorizations, EOD audits, team comms
export const SupervisorNavigation: React.FC<NavigationProps> = ({ currentView, onNavigate }) => {
  const { isSwahili } = useLanguage();

  const desktopItems = [
    { id: 'home', label: isSwahili ? 'Kituo cha Msimamizi' : 'Supervisor Hub', icon: ShieldCheck },
    { id: 'supervisor', label: isSwahili ? 'Ramani ya GPS' : 'Live Fleet Map', icon: MapPin },
    { id: 'orders', label: isSwahili ? 'Agizo Jipya' : 'New Order', icon: ShoppingCart },
    { id: 'reports', label: isSwahili ? 'Kaguzi za EOD' : 'EOD Audits', icon: FileText },
    { id: 'customers', label: isSwahili ? 'Wateja' : 'Customers', icon: Users },
    { id: 'forms', label: isSwahili ? 'Fomu za Google' : 'Google Forms', icon: ClipboardList },
    { id: 'activity', label: isSwahili ? 'Kumbukumbu' : 'Logs', icon: History },
    { id: 'account', label: isSwahili ? 'Akaunti' : 'Account', icon: User },
  ];

  return (
    <>
      <div className="hidden md:block bg-[#0D1E12] border-b border-[#243447]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-1 overflow-x-auto py-2 scrollbar-none">
            {desktopItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentView === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onNavigate(item.id)}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-[#8899AA] hover:text-white hover:bg-[#122010]'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-white' : ''}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#0A1A0F]/95 backdrop-blur-lg border-t border-[#243447] safe-area-pb">
        <div className="grid grid-cols-5 h-16 items-center px-1">
          <button
            onClick={() => onNavigate('home')}
            className={`flex flex-col items-center justify-center h-full text-center transition-colors ${
              currentView === 'home' ? 'text-blue-400' : 'text-[#8899AA]'
            }`}
          >
            <ShieldCheck className="w-5 h-5 mb-0.5" />
            <span className="text-[10px] font-medium tracking-tight">
              {isSwahili ? 'Msimamizi' : 'Command'}
            </span>
          </button>
          <button
            onClick={() => onNavigate('supervisor')}
            className={`flex flex-col items-center justify-center h-full text-center transition-colors ${
              currentView === 'supervisor' ? 'text-blue-400' : 'text-[#8899AA]'
            }`}
          >
            <MapPin className="w-5 h-5 mb-0.5" />
            <span className="text-[10px] font-medium tracking-tight">
              {isSwahili ? 'Ramani' : 'Map'}
            </span>
          </button>
          <button
            onClick={() => onNavigate('orders')}
            className={`flex flex-col items-center justify-center h-full text-center transition-colors ${
              currentView === 'orders' ? 'text-blue-400' : 'text-[#8899AA]'
            }`}
          >
            <ShoppingCart className="w-5 h-5 mb-0.5" />
            <span className="text-[10px] font-medium tracking-tight">
              {isSwahili ? 'Agizo' : 'Orders'}
            </span>
          </button>
          <button
            onClick={() => onNavigate('reports')}
            className={`flex flex-col items-center justify-center h-full text-center transition-colors ${
              currentView === 'reports' ? 'text-blue-400' : 'text-[#8899AA]'
            }`}
          >
            <FileText className="w-5 h-5 mb-0.5" />
            <span className="text-[10px] font-medium tracking-tight">
              {isSwahili ? 'EOD' : 'Audits'}
            </span>
          </button>
          <button
            onClick={() => onNavigate('customers')}
            className={`flex flex-col items-center justify-center h-full text-center transition-colors ${
              currentView === 'customers' ? 'text-blue-400' : 'text-[#8899AA]'
            }`}
          >
            <Users className="w-5 h-5 mb-0.5" />
            <span className="text-[10px] font-medium tracking-tight">
              {isSwahili ? 'Wateja' : 'Clients'}
            </span>
          </button>
        </div>
      </div>
    </>
  );
};

// Dispatcher Navigation: fleet queue, route balancing, order dispatching, drivers
export const DispatcherNavigation: React.FC<NavigationProps> = ({ currentView, onNavigate }) => {
  const { isSwahili } = useLanguage();

  const desktopItems = [
    { id: 'home', label: isSwahili ? 'Bodi ya Usambazaji' : 'Dispatch Hub', icon: Truck },
    { id: 'supervisor', label: isSwahili ? 'Ramani & Njia' : 'Routes & Fleet', icon: MapPin },
    { id: 'orders', label: isSwahili ? 'Agizo Jipya' : 'Create Order', icon: ShoppingCart },
    { id: 'analytics', label: isSwahili ? 'Utabiri wa Njia' : 'AI Forecast', icon: Sparkles },
    { id: 'customers', label: isSwahili ? 'Wateja' : 'Customers', icon: Users },
    { id: 'messages', label: isSwahili ? 'Mawasiliano' : 'Driver Comms', icon: MessageSquare },
    { id: 'activity', label: isSwahili ? 'Kumbukumbu' : 'Logs', icon: History },
    { id: 'account', label: isSwahili ? 'Akaunti' : 'Account', icon: User },
  ];

  return (
    <>
      <div className="hidden md:block bg-[#0D1E12] border-b border-[#243447]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-1 overflow-x-auto py-2 scrollbar-none">
            {desktopItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentView === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onNavigate(item.id)}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
                    isActive
                      ? 'bg-amber-600 text-white shadow-sm'
                      : 'text-[#8899AA] hover:text-white hover:bg-[#122010]'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-white' : ''}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#0A1A0F]/95 backdrop-blur-lg border-t border-[#243447] safe-area-pb">
        <div className="grid grid-cols-5 h-16 items-center px-1">
          <button
            onClick={() => onNavigate('home')}
            className={`flex flex-col items-center justify-center h-full text-center transition-colors ${
              currentView === 'home' ? 'text-amber-400' : 'text-[#8899AA]'
            }`}
          >
            <Truck className="w-5 h-5 mb-0.5" />
            <span className="text-[10px] font-medium tracking-tight">
              {isSwahili ? 'Sambaza' : 'Dispatch'}
            </span>
          </button>
          <button
            onClick={() => onNavigate('supervisor')}
            className={`flex flex-col items-center justify-center h-full text-center transition-colors ${
              currentView === 'supervisor' ? 'text-amber-400' : 'text-[#8899AA]'
            }`}
          >
            <MapPin className="w-5 h-5 mb-0.5" />
            <span className="text-[10px] font-medium tracking-tight">
              {isSwahili ? 'Ramani' : 'Fleet'}
            </span>
          </button>
          <button
            onClick={() => onNavigate('orders')}
            className={`flex flex-col items-center justify-center h-full text-center transition-colors ${
              currentView === 'orders' ? 'text-amber-400' : 'text-[#8899AA]'
            }`}
          >
            <ShoppingCart className="w-5 h-5 mb-0.5" />
            <span className="text-[10px] font-medium tracking-tight">
              {isSwahili ? 'Agizo' : 'Orders'}
            </span>
          </button>
          <button
            onClick={() => onNavigate('customers')}
            className={`flex flex-col items-center justify-center h-full text-center transition-colors ${
              currentView === 'customers' ? 'text-amber-400' : 'text-[#8899AA]'
            }`}
          >
            <Users className="w-5 h-5 mb-0.5" />
            <span className="text-[10px] font-medium tracking-tight">
              {isSwahili ? 'Wateja' : 'Clients'}
            </span>
          </button>
          <button
            onClick={() => onNavigate('messages')}
            className={`flex flex-col items-center justify-center h-full text-center transition-colors ${
              currentView === 'messages' ? 'text-amber-400' : 'text-[#8899AA]'
            }`}
          >
            <MessageSquare className="w-5 h-5 mb-0.5" />
            <span className="text-[10px] font-medium tracking-tight">
              {isSwahili ? 'Dereva' : 'Drivers'}
            </span>
          </button>
        </div>
      </div>
    </>
  );
};

// Manager Navigation: revenue analytics, staff performance, plant audits, inventory
export const ManagerNavigation: React.FC<NavigationProps> = ({ currentView, onNavigate }) => {
  const { isSwahili } = useLanguage();

  const desktopItems = [
    { id: 'home', label: isSwahili ? 'Dashibodi ya Meneja' : 'Executive Overview', icon: TrendingUp },
    { id: 'analytics', label: isSwahili ? 'Takwimu za Mapato' : 'Revenue Analytics', icon: BarChart3 },
    { id: 'supervisor', label: isSwahili ? 'Usimamizi wa Eneo' : 'Operations Oversight', icon: ShieldCheck },
    { id: 'reports', label: isSwahili ? 'Kaguzi za EOD' : 'EOD Financial Audits', icon: FileText },
    { id: 'customers', label: isSwahili ? 'Wateja & Akaunti' : 'Client Accounts', icon: Users },
    { id: 'activity', label: isSwahili ? 'Kumbukumbu' : 'Audit Logs', icon: History },
    { id: 'account', label: isSwahili ? 'Akaunti' : 'Account', icon: User },
  ];

  return (
    <>
      <div className="hidden md:block bg-[#0D1E12] border-b border-[#243447]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-1 overflow-x-auto py-2 scrollbar-none">
            {desktopItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentView === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onNavigate(item.id)}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
                    isActive
                      ? 'bg-purple-600 text-white shadow-sm'
                      : 'text-[#8899AA] hover:text-white hover:bg-[#122010]'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-white' : ''}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#0A1A0F]/95 backdrop-blur-lg border-t border-[#243447] safe-area-pb">
        <div className="grid grid-cols-5 h-16 items-center px-1">
          <button
            onClick={() => onNavigate('home')}
            className={`flex flex-col items-center justify-center h-full text-center transition-colors ${
              currentView === 'home' ? 'text-purple-400' : 'text-[#8899AA]'
            }`}
          >
            <TrendingUp className="w-5 h-5 mb-0.5" />
            <span className="text-[10px] font-medium tracking-tight">
              {isSwahili ? 'Kuu' : 'Executive'}
            </span>
          </button>
          <button
            onClick={() => onNavigate('analytics')}
            className={`flex flex-col items-center justify-center h-full text-center transition-colors ${
              currentView === 'analytics' ? 'text-purple-400' : 'text-[#8899AA]'
            }`}
          >
            <BarChart3 className="w-5 h-5 mb-0.5" />
            <span className="text-[10px] font-medium tracking-tight">
              {isSwahili ? 'Mapato' : 'Revenue'}
            </span>
          </button>
          <button
            onClick={() => onNavigate('supervisor')}
            className={`flex flex-col items-center justify-center h-full text-center transition-colors ${
              currentView === 'supervisor' ? 'text-purple-400' : 'text-[#8899AA]'
            }`}
          >
            <ShieldCheck className="w-5 h-5 mb-0.5" />
            <span className="text-[10px] font-medium tracking-tight">
              {isSwahili ? 'Msimamizi' : 'Plant Ops'}
            </span>
          </button>
          <button
            onClick={() => onNavigate('reports')}
            className={`flex flex-col items-center justify-center h-full text-center transition-colors ${
              currentView === 'reports' ? 'text-purple-400' : 'text-[#8899AA]'
            }`}
          >
            <FileText className="w-5 h-5 mb-0.5" />
            <span className="text-[10px] font-medium tracking-tight">
              {isSwahili ? 'EOD' : 'Audits'}
            </span>
          </button>
          <button
            onClick={() => onNavigate('account')}
            className={`flex flex-col items-center justify-center h-full text-center transition-colors ${
              currentView === 'account' ? 'text-purple-400' : 'text-[#8899AA]'
            }`}
          >
            <User className="w-5 h-5 mb-0.5" />
            <span className="text-[10px] font-medium tracking-tight">
              {isSwahili ? 'Akaunti' : 'Account'}
            </span>
          </button>
        </div>
      </div>
    </>
  );
};

// Field Staff Navigation: daily deliveries, POS orders, EOD submissions
export const FieldStaffNavigation: React.FC<NavigationProps> = ({ currentView, onNavigate }) => {
  const { isSwahili } = useLanguage();

  const desktopItems = [
    { id: 'home', label: isSwahili ? 'Njia ya Usambazaji' : 'Delivery Route', icon: LayoutDashboard },
    { id: 'orders', label: isSwahili ? 'Agizo Jipya (POS)' : 'New Order (POS)', icon: ShoppingCart },
    { id: 'reports', label: isSwahili ? 'Ripoti ya Siku' : 'EOD Report', icon: FileText },
    { id: 'customers', label: isSwahili ? 'Wateja' : 'Customers', icon: Users },
    { id: 'messages', label: isSwahili ? 'Mawasiliano' : 'Chat', icon: MessageSquare },
    { id: 'forms', label: isSwahili ? 'Fomu za Google' : 'Google Forms', icon: ClipboardList },
    { id: 'account', label: isSwahili ? 'Akaunti' : 'Account', icon: User },
  ];

  return (
    <>
      <div className="hidden md:block bg-[#0D1E12] border-b border-[#243447]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-1 overflow-x-auto py-2 scrollbar-none">
            {desktopItems.map((item) => {
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

      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#0A1A0F]/95 backdrop-blur-lg border-t border-[#243447] safe-area-pb">
        <div className="grid grid-cols-5 h-16 items-center px-1">
          <button
            onClick={() => onNavigate('home')}
            className={`flex flex-col items-center justify-center h-full text-center transition-colors ${
              currentView === 'home' ? 'text-[#00C46A]' : 'text-[#8899AA]'
            }`}
          >
            <LayoutDashboard className="w-5 h-5 mb-0.5" />
            <span className="text-[10px] font-medium tracking-tight">
              {isSwahili ? 'Njia' : 'Route'}
            </span>
          </button>
          <button
            onClick={() => onNavigate('orders')}
            className={`flex flex-col items-center justify-center h-full text-center transition-colors ${
              currentView === 'orders' ? 'text-[#00C46A]' : 'text-[#8899AA]'
            }`}
          >
            <ShoppingCart className="w-5 h-5 mb-0.5" />
            <span className="text-[10px] font-medium tracking-tight">
              {isSwahili ? 'Agizo' : 'Order'}
            </span>
          </button>
          <button
            onClick={() => onNavigate('reports')}
            className={`flex flex-col items-center justify-center h-full text-center transition-colors ${
              currentView === 'reports' ? 'text-[#00C46A]' : 'text-[#8899AA]'
            }`}
          >
            <FileText className="w-5 h-5 mb-0.5" />
            <span className="text-[10px] font-medium tracking-tight">
              {isSwahili ? 'Ripoti' : 'EOD'}
            </span>
          </button>
          <button
            onClick={() => onNavigate('customers')}
            className={`flex flex-col items-center justify-center h-full text-center transition-colors ${
              currentView === 'customers' ? 'text-[#00C46A]' : 'text-[#8899AA]'
            }`}
          >
            <Users className="w-5 h-5 mb-0.5" />
            <span className="text-[10px] font-medium tracking-tight">
              {isSwahili ? 'Wateja' : 'Clients'}
            </span>
          </button>
          <button
            onClick={() => onNavigate('messages')}
            className={`flex flex-col items-center justify-center h-full text-center transition-colors ${
              currentView === 'messages' ? 'text-[#00C46A]' : 'text-[#8899AA]'
            }`}
          >
            <MessageSquare className="w-5 h-5 mb-0.5" />
            <span className="text-[10px] font-medium tracking-tight">
              {isSwahili ? 'Ujumbe' : 'Chat'}
            </span>
          </button>
        </div>
      </div>
    </>
  );
};

// Default unified navigation export that dynamically picks based on AuthContext role
export const Navigation: React.FC<NavigationProps> = (props) => {
  const { role } = useAuth();

  switch (role) {
    case 'supervisor':
      return <SupervisorNavigation {...props} />;
    case 'dispatcher':
      return <DispatcherNavigation {...props} />;
    case 'manager':
      return <ManagerNavigation {...props} />;
    case 'field_staff':
    default:
      return <FieldStaffNavigation {...props} />;
  }
};
