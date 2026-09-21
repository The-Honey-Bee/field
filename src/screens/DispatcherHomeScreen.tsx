import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { storageService } from '../services/storage';
import { Order, TimelineTask } from '../types';
import { DeliveryForecastOptimizer } from '../components/DeliveryForecastOptimizer';
import { SupervisorLiveMap } from '../components/SupervisorLiveMap';
import {
  Truck,
  Package,
  Clock,
  CheckCircle2,
  AlertCircle,
  MapPin,
  TrendingUp,
  Plus,
  Send,
  RefreshCw,
  PhoneCall,
  Calendar,
  Layers,
  ChevronRight,
  Sparkles,
  Users,
  Navigation,
} from 'lucide-react';

interface DispatcherHomeScreenProps {
  onNavigate: (view: string) => void;
}

interface DeliveryVehicle {
  id: string;
  plate: string;
  driverName: string;
  driverPhone: string;
  routeZone: string;
  capacityBottles: number;
  currentLoad: number;
  status: 'loading' | 'in_transit' | 'delivering' | 'completed';
  assignedOrdersCount: number;
}

export const DispatcherHomeScreen: React.FC<DispatcherHomeScreenProps> = ({ onNavigate }) => {
  const { user } = useAuth();
  const { isSwahili } = useLanguage();
  const [orders, setOrders] = useState<Order[]>([]);
  const [activeTab, setActiveTab] = useState<'board' | 'forecast' | 'routes' | 'map'>('board');
  const [feedback, setFeedback] = useState<string | null>(null);

  // Mwanza Plant Fleet Status
  const [vehicles, setVehicles] = useState<DeliveryVehicle[]>([
    {
      id: 'veh-1',
      plate: 'T 412 DZZ',
      driverName: 'Salim Bakari',
      driverPhone: '+255 754 112 301',
      routeZone: 'Nyakato & Buzuruga Corridor',
      capacityBottles: 60,
      currentLoad: 48,
      status: 'in_transit',
      assignedOrdersCount: 5,
    },
    {
      id: 'veh-2',
      plate: 'T 834 EZZ',
      driverName: 'Juma Ramadhani',
      driverPhone: '+255 768 990 412',
      routeZone: 'Capripoint & City Centre CBD',
      capacityBottles: 60,
      currentLoad: 54,
      status: 'delivering',
      assignedOrdersCount: 6,
    },
    {
      id: 'veh-3',
      plate: 'T 119 CZZ',
      driverName: 'Baraka Mushi',
      driverPhone: '+255 712 884 901',
      routeZone: 'Kirumba, Airport Rd & Pasiansi',
      capacityBottles: 60,
      currentLoad: 40,
      status: 'in_transit',
      assignedOrdersCount: 4,
    },
    {
      id: 'veh-4',
      plate: 'T 602 AZZ',
      driverName: 'Ali Hassan',
      driverPhone: '+255 744 330 198',
      routeZone: 'Nyegezi, Butimba & Mabatini',
      capacityBottles: 35,
      currentLoad: 28,
      status: 'loading',
      assignedOrdersCount: 3,
    },
  ]);

  const loadOrders = () => {
    setOrders(storageService.getOrders());
  };

  useEffect(() => {
    loadOrders();
    const interval = setInterval(loadOrders, 10000);
    return () => clearInterval(interval);
  }, []);

  const totalLoadedBottles = vehicles.reduce((sum, v) => sum + v.currentLoad, 0);
  const totalFleetCapacity = vehicles.reduce((sum, v) => sum + v.capacityBottles, 0);
  const utilizationPct = Math.round((totalLoadedBottles / totalFleetCapacity) * 100);

  const handleQuickDispatch = (vehicleId: string) => {
    setVehicles((prev) =>
      prev.map((v) =>
        v.id === vehicleId
          ? { ...v, status: v.status === 'loading' ? 'in_transit' : 'delivering' }
          : v
      )
    );
    setFeedback(isSwahili ? 'Gari limetumwa kwenye njia kikamilifu.' : 'Vehicle dispatched to route successfully.');
    setTimeout(() => setFeedback(null), 3000);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-24 md:pb-12">
      {/* Dispatcher Command Header */}
      <div className="bg-gradient-to-r from-[#182613] via-[#1E2E16] to-[#1F2B38] border border-[#243447] rounded-2xl p-5 shadow-xl relative overflow-hidden">
        <div className="absolute -right-8 -top-8 w-40 h-40 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shadow-md">
              <Truck className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                  {user?.name || 'Grace Matiku'}
                </h1>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                  Dispatcher
                </span>
                <span className="text-xs px-2 py-0.5 rounded-md bg-[#122010] text-[#00C46A] border border-[#2A5038] font-mono">
                  {user?.plant || 'Mwanza Plant'}
                </span>
              </div>
              <p className="text-xs text-[#8899AA] mt-0.5 flex items-center gap-2">
                <span>{user?.title || 'Fleet & Delivery Dispatcher'}</span>
                <span>&bull;</span>
                <span className="font-mono text-[#D0E8F0]">ID: {user?.employeeId || 'ZZ-MWZ-DISP-01'}</span>
                <span>&bull;</span>
                <span className="text-amber-400 font-medium">Fleet Dispatch Desk</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onNavigate('orders')}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-[#006B3C] hover:bg-[#008A4D] text-white rounded-xl text-xs font-bold transition shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>{isSwahili ? 'Agizo la Haraka' : 'Dispatch New Order'}</span>
            </button>
            <button
              onClick={() => onNavigate('supervisor')}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-[#1A2E1C] hover:bg-[#243E26] text-white rounded-xl text-xs font-semibold border border-[#2A5038] transition"
            >
              <MapPin className="w-3.5 h-3.5 text-[#00C46A]" />
              <span>{isSwahili ? 'Ramani ya Njia' : 'Live Fleet Map'}</span>
            </button>
            <button
              onClick={loadOrders}
              className="p-2 bg-[#122010] hover:bg-[#1A2E1C] text-[#8899AA] hover:text-white rounded-xl border border-[#243447] transition"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {feedback && (
        <div className="bg-amber-950/50 border border-amber-500/50 p-3.5 rounded-xl flex items-center gap-2.5 text-xs text-amber-200 shadow-lg">
          <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />
          <span className="font-medium">{feedback}</span>
        </div>
      )}

      {/* Dispatcher KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-[#0D1E12] border border-[#243447] p-4 rounded-xl">
          <div className="flex items-center justify-between text-[#8899AA] text-xs font-medium mb-2">
            <span>{isSwahili ? 'Magari Njia za Ziwa' : 'Vehicles in Transit'}</span>
            <Truck className="w-4 h-4 text-amber-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-white">{vehicles.length}</span>
            <span className="text-[11px] text-[#00C46A] font-medium">{isSwahili ? '100% Inafanya Kazi' : '100% Active'}</span>
          </div>
          <p className="text-[10px] text-[#8899AA] mt-1">{isSwahili ? 'Njia zote 4 zina huduma' : 'All 4 Lake corridors served'}</p>
        </div>

        <div className="bg-[#0D1E12] border border-[#243447] p-4 rounded-xl">
          <div className="flex items-center justify-between text-[#8899AA] text-xs font-medium mb-2">
            <span>{isSwahili ? 'Chupa Zilizopakiwa' : 'Loaded Pure Water'}</span>
            <Package className="w-4 h-4 text-[#00C46A]" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-white">{totalLoadedBottles}</span>
            <span className="text-[11px] text-[#8899AA]">/ {totalFleetCapacity}</span>
          </div>
          <p className="text-[10px] text-[#00C46A] mt-1 font-medium">{utilizationPct}% {isSwahili ? 'uwezo wa kubeba' : 'fleet capacity used'}</p>
        </div>

        <div className="bg-[#0D1E12] border border-[#243447] p-4 rounded-xl">
          <div className="flex items-center justify-between text-[#8899AA] text-xs font-medium mb-2">
            <span>{isSwahili ? 'Maagizo ya Leo' : 'Total Orders Cleared'}</span>
            <Clock className="w-4 h-4 text-blue-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-white">{orders.length}</span>
            <span className="text-[11px] text-blue-300 font-medium">{orders.filter((o) => o.status === 'approved').length} {isSwahili ? 'zilizoidhinishwa' : 'approved'}</span>
          </div>
          <p className="text-[10px] text-[#8899AA] mt-1">{isSwahili ? 'Kiwango cha usahihi 98%' : 'Dispatch precision 98%'}</p>
        </div>

        <div className="bg-[#0D1E12] border border-[#243447] p-4 rounded-xl">
          <div className="flex items-center justify-between text-[#8899AA] text-xs font-medium mb-2">
            <span>{isSwahili ? 'Mizunguko ya Kurudia' : 'Empty Bottles Ret.'}</span>
            <Layers className="w-4 h-4 text-purple-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-white">128</span>
            <span className="text-[11px] text-purple-300 font-medium">18.9L / Refill</span>
          </div>
          <p className="text-[10px] text-[#8899AA] mt-1">{isSwahili ? 'Upatanisho wa maghala' : 'Sanitization pipeline'}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex bg-[#122010] p-1.5 rounded-xl border border-[#243447] gap-1 overflow-x-auto">
        <button
          onClick={() => setActiveTab('board')}
          className={`flex-1 min-w-[140px] py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${
            activeTab === 'board' ? 'bg-[#006B3C] text-white shadow' : 'text-[#8899AA] hover:text-white'
          }`}
        >
          <Truck className="w-3.5 h-3.5" />
          <span>{isSwahili ? 'Bodi ya Usambazaji' : 'Fleet Dispatch Board'}</span>
        </button>

        <button
          onClick={() => setActiveTab('forecast')}
          className={`flex-1 min-w-[140px] py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${
            activeTab === 'forecast' ? 'bg-[#006B3C] text-white shadow' : 'text-[#8899AA] hover:text-white'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span>{isSwahili ? 'Utabiri & Mizigo' : 'AI Route Optimizer'}</span>
        </button>

        <button
          onClick={() => setActiveTab('routes')}
          className={`flex-1 min-w-[140px] py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${
            activeTab === 'routes' ? 'bg-[#006B3C] text-white shadow' : 'text-[#8899AA] hover:text-white'
          }`}
        >
          <MapPin className="w-3.5 h-3.5 text-[#00C46A]" />
          <span>{isSwahili ? 'Njia za Ziwa (Mwanza)' : 'Mwanza Route Corridors'}</span>
        </button>

        <button
          onClick={() => setActiveTab('map')}
          className={`flex-1 min-w-[140px] py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${
            activeTab === 'map' ? 'bg-[#006B3C] text-white shadow' : 'text-[#8899AA] hover:text-white'
          }`}
        >
          <Navigation className="w-3.5 h-3.5 text-[#00C46A]" />
          <span>{isSwahili ? 'Ramani ya Protomaps' : 'Protomaps Live Map'}</span>
        </button>
      </div>

      {/* Tab: Fleet Dispatch Board */}
      {activeTab === 'board' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {vehicles.map((v) => {
              const loadPct = Math.round((v.currentLoad / v.capacityBottles) * 100);
              return (
                <div
                  key={v.id}
                  className="bg-[#0D1E12] border border-[#243447] hover:border-amber-500/40 rounded-xl p-4.5 space-y-3 transition-all"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-black text-white">{v.plate}</span>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            v.status === 'in_transit'
                              ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                              : v.status === 'delivering'
                              ? 'bg-[#006B3C]/40 text-[#00C46A] border border-[#00C46A]/40'
                              : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                          }`}
                        >
                          {v.status.replace('_', ' ')}
                        </span>
                      </div>
                      <p className="text-xs text-[#8899AA] mt-1 flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-[#00C46A]" />
                        <span>{v.routeZone}</span>
                      </p>
                    </div>

                    <div className="text-right">
                      <span className="text-xs font-mono font-bold text-white">
                        {v.currentLoad} / {v.capacityBottles}
                      </span>
                      <p className="text-[10px] text-[#8899AA]">{isSwahili ? 'Chupa Zimebebwa' : 'Bottles on board'}</p>
                    </div>
                  </div>

                  {/* Capacity Bar */}
                  <div className="space-y-1">
                    <div className="w-full h-2 bg-[#1A2E1C] rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          loadPct > 85 ? 'bg-amber-400' : 'bg-[#00C46A]'
                        }`}
                        style={{ width: `${loadPct}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[10px] text-[#8899AA]">
                      <span>{loadPct}% {isSwahili ? 'Ujazo' : 'Capacity'}</span>
                      <span>{v.assignedOrdersCount} {isSwahili ? 'Maagizo' : 'Orders assigned'}</span>
                    </div>
                  </div>

                  {/* Driver and Action */}
                  <div className="flex items-center justify-between pt-2 border-t border-[#1A2E1C]">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-[#8899AA]" />
                      <div className="text-xs">
                        <span className="text-white font-medium">{v.driverName}</span>
                        <a
                          href={`tel:${v.driverPhone}`}
                          className="block text-[10px] text-blue-400 hover:underline"
                        >
                          {v.driverPhone}
                        </a>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => onNavigate('messages')}
                        className="p-1.5 bg-[#122010] hover:bg-[#1A2E1C] text-blue-400 rounded-lg border border-[#243447] transition"
                        title="Direct Message Driver"
                      >
                        <Send className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleQuickDispatch(v.id)}
                        className="px-3 py-1.5 bg-[#006B3C] hover:bg-[#008A4D] text-white rounded-lg text-xs font-bold transition flex items-center gap-1 shadow-sm"
                      >
                        <Truck className="w-3.5 h-3.5" />
                        <span>{isSwahili ? 'Tuma Njia' : 'Dispatch'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Quick Route Assignment Info */}
          <div className="bg-[#0D1E12] border border-[#243447] rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-[#006B3C]/20 border border-[#00C46A]/30 text-[#00C46A]">
                <Package className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">
                  {isSwahili ? 'Kugawa Maagizo ya Dharura au Mapya' : 'Immediate Order Dispatching & Assignment'}
                </h4>
                <p className="text-xs text-[#8899AA] mt-0.5">
                  {isSwahili
                    ? 'Chagua mteja au unda agizo jipya ili ligawiwe moja kwa moja kwa dereva aliye karibu'
                    : 'Dispatch immediate customer refills directly to the closest vehicle in the Lake Zone'}
                </p>
              </div>
            </div>
            <button
              onClick={() => onNavigate('orders')}
              className="px-4 py-2 bg-[#006B3C] hover:bg-[#008A4D] text-white rounded-xl text-xs font-bold transition whitespace-nowrap shadow-sm"
            >
              {isSwahili ? 'Unda Agizo la Usambazaji' : 'Create Dispatch Order'}
            </button>
          </div>
        </div>
      )}

      {/* Tab: AI Route Optimizer */}
      {activeTab === 'forecast' && (
        <div className="space-y-4">
          <DeliveryForecastOptimizer orders={orders} />
        </div>
      )}

      {/* Tab: Mwanza Route Corridors */}
      {activeTab === 'routes' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-[#0D1E12] border border-[#243447] p-4 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-white">Njia 1: Nyakato Industrial & Buzuruga</h4>
                <span className="text-xs font-mono text-[#00C46A]">High Volume</span>
              </div>
              <p className="text-xs text-[#8899AA]">
                Musoma Road, Nyakato Plant Gate, Buzuruga Plaza, Igoma Junction.
              </p>
              <div className="text-xs text-white pt-1">
                <span className="text-[#8899AA]">Primary Van:</span> T 412 DZZ (Salim Bakari)
              </div>
            </div>

            <div className="bg-[#0D1E12] border border-[#243447] p-4 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-white">Njia 2: Capripoint Waterfront & CBD</h4>
                <span className="text-xs font-mono text-blue-400">Corporate & Hotel</span>
              </div>
              <p className="text-xs text-[#8899AA]">
                Capripoint Hill, Tilapia Waterfront, Posta Mwanza, Makoroboi Commercial Market.
              </p>
              <div className="text-xs text-white pt-1">
                <span className="text-[#8899AA]">Primary Van:</span> T 834 EZZ (Juma Ramadhani)
              </div>
            </div>

            <div className="bg-[#0D1E12] border border-[#243447] p-4 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-white">Njia 3: Kirumba & Airport Road</h4>
                <span className="text-xs font-mono text-amber-400">Regular Refills</span>
              </div>
              <p className="text-xs text-[#8899AA]">
                Makongoro Road, CCM Kirumba Stadium, Pasiansi, Airport Corridor.
              </p>
              <div className="text-xs text-white pt-1">
                <span className="text-[#8899AA]">Primary Van:</span> T 119 CZZ (Baraka Mushi)
              </div>
            </div>

            <div className="bg-[#0D1E12] border border-[#243447] p-4 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-white">Njia 4: Nyegezi, Butimba & Mabatini</h4>
                <span className="text-xs font-mono text-purple-400">High Frequency</span>
              </div>
              <p className="text-xs text-[#8899AA]">
                Shinyanga Road, Nyegezi Bus Terminal, Butimba Teachers College, Mabatini.
              </p>
              <div className="text-xs text-white pt-1">
                <span className="text-[#8899AA]">Primary Vehicle:</span> T 602 AZZ (Ali Hassan)
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              onClick={() => onNavigate('supervisor')}
              className="px-4 py-2 bg-[#1A2E1C] hover:bg-[#243E26] text-white rounded-xl text-xs font-bold border border-[#2A5038] transition flex items-center gap-2"
            >
              <MapPin className="w-4 h-4 text-[#00C46A]" />
              <span>{isSwahili ? 'Fungua Ramani ya Moja kwa Moja ya GPS' : 'Open Full GPS Fleet Telemetry'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Tab: Protomaps Live Field Map */}
      {activeTab === 'map' && (
        <div className="space-y-4">
          <SupervisorLiveMap onNavigate={onNavigate} />
        </div>
      )}
    </div>
  );
};
