import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import {
  geolocationService,
  DAR_ES_SALAAM_HUBS,
  calculateDistanceKm,
} from '../services/geolocation';
import { FieldTeamLocation, TeamFieldStatus } from '../types';
import {
  Truck,
  Navigation as NavIcon,
  Play,
  Pause,
  RefreshCw,
  Crosshair,
  Compass,
  Battery,
  ShieldCheck,
  AlertCircle,
  Clock,
  Phone,
  MessageSquare,
  Filter,
  Layers,
  CheckCircle2,
  Package,
  Activity,
  Radio,
  MapPin,
  ChevronRight,
  Maximize2,
  Zap,
} from 'lucide-react';

interface SupervisorLiveMapProps {
  onNavigate?: (view: string) => void;
}

type TileLayerKey = 'dark' | 'streets' | 'satellite';

const TILE_SERVERS: Record<TileLayerKey, { url: string; attribution: string; name: string }> = {
  dark: {
    name: 'Logistics Dark',
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://carto.com/">CARTO</a>, &copy; OpenStreetMap contributors',
  },
  streets: {
    name: 'Street Map',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; OpenStreetMap contributors',
  },
  satellite: {
    name: 'Voyager Daylight',
    url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
    attribution: '&copy; CARTO &copy; OpenStreetMap contributors',
  },
};

export const SupervisorLiveMap: React.FC<SupervisorLiveMapProps> = ({ onNavigate }) => {
  const { isSwahili } = useLanguage();
  const { user } = useAuth();

  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const routesLayerRef = useRef<L.LayerGroup | null>(null);

  const [fleet, setFleet] = useState<FieldTeamLocation[]>([]);
  const [selectedDriver, setSelectedDriver] = useState<FieldTeamLocation | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [currentTileType, setCurrentTileType] = useState<TileLayerKey>('dark');
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());
  const [isMyGpsBroadcasting, setIsMyGpsBroadcasting] = useState<boolean>(false);
  const [myGpsLocation, setMyGpsLocation] = useState<FieldTeamLocation | null>(null);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [isLocatingSupervisor, setIsLocatingSupervisor] = useState<boolean>(false);

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return;

    // Default center on Dar es Salaam central logistics zone
    const defaultCenter: [number, number] = [-6.7924, 39.2450];
    const map = L.map(mapContainerRef.current, {
      center: defaultCenter,
      zoom: 13,
      zoomControl: false,
      attributionControl: false,
    });

    // Custom attribution
    L.control.attribution({ position: 'bottomright', prefix: false }).addTo(map);

    // Zoom controls at top right
    L.control.zoom({ position: 'topright' }).addTo(map);

    // Tile Layer
    const tileConfig = TILE_SERVERS[currentTileType];
    const baseTile = L.tileLayer(tileConfig.url, {
      attribution: tileConfig.attribution,
      maxZoom: 19,
      subdomains: 'abcd',
    }).addTo(map);

    tileLayerRef.current = baseTile;

    // Markers & Routes layer groups
    const markersGroup = L.layerGroup().addTo(map);
    const routesGroup = L.layerGroup().addTo(map);

    markersLayerRef.current = markersGroup;
    routesLayerRef.current = routesGroup;
    mapInstanceRef.current = map;

    // Resize observer to ensure map canvas fits nicely
    const resizeObserver = new ResizeObserver(() => {
      map.invalidateSize();
    });
    resizeObserver.observe(mapContainerRef.current);

    return () => {
      resizeObserver.disconnect();
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Change Tile Type
  const handleTileChange = (newType: TileLayerKey) => {
    if (!mapInstanceRef.current || !tileLayerRef.current) return;
    setCurrentTileType(newType);
    tileLayerRef.current.remove();

    const tileConfig = TILE_SERVERS[newType];
    const newTile = L.tileLayer(tileConfig.url, {
      attribution: tileConfig.attribution,
      maxZoom: 19,
      subdomains: 'abcd',
    }).addTo(mapInstanceRef.current);

    tileLayerRef.current = newTile;
  };

  // Subscribe to Fleet Locations
  useEffect(() => {
    const unsubscribe = geolocationService.subscribeToFleet((locations) => {
      setFleet(locations);
      setLastRefreshed(new Date());
    });

    const unsubMyGps = geolocationService.subscribeToCurrentLocation((loc) => {
      setMyGpsLocation(loc);
      setIsMyGpsBroadcasting(geolocationService.isTrackingActive());
    });

    setIsSimulating(geolocationService.isSimulationActive());

    return () => {
      unsubscribe();
      unsubMyGps();
    };
  }, []);

  // Update Map Markers whenever fleet or filters change
  useEffect(() => {
    const map = mapInstanceRef.current;
    const markersGroup = markersLayerRef.current;
    const routesGroup = routesLayerRef.current;

    if (!map || !markersGroup || !routesGroup) return;

    markersGroup.clearLayers();
    routesGroup.clearLayers();

    // 1. Add Central Depot Marker
    const depotIcon = L.divIcon({
      className: 'depot-map-marker',
      html: `
        <div class="relative flex items-center justify-center">
          <div class="absolute -inset-1.5 rounded-full bg-[#00C46A]/20 animate-ping"></div>
          <div class="w-10 h-10 rounded-2xl bg-[#006B3C] border-2 border-[#00C46A] shadow-xl flex items-center justify-center text-white">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path>
            </svg>
          </div>
          <div class="absolute -bottom-5 bg-[#0A1A0F]/90 text-[#00C46A] text-[9px] font-bold px-1.5 py-0.5 rounded border border-[#00C46A]/40 whitespace-nowrap shadow">
            UBUNGO DEPOT
          </div>
        </div>
      `,
      iconSize: [40, 40],
      iconAnchor: [20, 20],
    });

    const depotMarker = L.marker([DAR_ES_SALAAM_HUBS.DEPOT_UBUNGO.lat, DAR_ES_SALAAM_HUBS.DEPOT_UBUNGO.lng], {
      icon: depotIcon,
      zIndexOffset: 50,
    });

    depotMarker.bindPopup(`
      <div class="text-[#0A1A0F] font-sans p-1 min-w-[200px]">
        <div class="font-bold text-sm text-[#006B3C] flex items-center gap-1.5">
          <span>Central Depot - Ubungo Hub</span>
        </div>
        <div class="text-xs text-gray-600 mt-0.5">Morogoro Road, Ubungo, Dar es Salaam</div>
        <div class="mt-2 pt-2 border-t border-gray-200 grid grid-cols-2 gap-1 text-[11px]">
          <div><strong>Status:</strong> Active Dispatch</div>
          <div><strong>Stock:</strong> 550x 18.9L</div>
        </div>
      </div>
    `);
    markersGroup.addLayer(depotMarker);

    // 2. Filter fleet
    const filteredFleet = fleet.filter((driver) => {
      if (statusFilter === 'all') return true;
      return driver.status === statusFilter;
    });

    // 3. Add Driver Markers
    filteredFleet.forEach((driver) => {
      const isSelected = selectedDriver?.userId === driver.userId;

      // Status color palette
      let statusBg = 'bg-[#00C46A]';
      let statusBorder = 'border-[#00C46A]';
      let ringColor = 'bg-[#00C46A]/30';
      let statusLabel = 'En Route';

      if (driver.status === 'at_customer') {
        statusBg = 'bg-[#3B82F6]';
        statusBorder = 'border-[#60A5FA]';
        ringColor = 'bg-blue-500/30';
        statusLabel = 'At Customer';
      } else if (driver.status === 'delivering') {
        statusBg = 'bg-[#A855F7]';
        statusBorder = 'border-[#C084FC]';
        ringColor = 'bg-purple-500/30';
        statusLabel = 'Delivering';
      } else if (driver.status === 'depot_reload') {
        statusBg = 'bg-[#F59E0B]';
        statusBorder = 'border-[#FBBF24]';
        ringColor = 'bg-amber-500/30';
        statusLabel = 'Depot Reload';
      } else if (driver.status === 'idle' || !driver.isOnline) {
        statusBg = 'bg-[#64748B]';
        statusBorder = 'border-[#94A3B8]';
        ringColor = 'bg-gray-500/20';
        statusLabel = 'Idle';
      }

      const headingDeg = driver.heading || 0;
      const speedDisplay = driver.speed ? `${driver.speed} km/h` : 'Stopped';

      const driverDivIcon = L.divIcon({
        className: 'fleet-driver-pin',
        html: `
          <div class="relative cursor-pointer group select-none">
            ${
              driver.speed && driver.speed > 5
                ? `<div class="absolute -inset-2 rounded-full ${ringColor} animate-ping"></div>`
                : ''
            }
            <div class="w-11 h-11 rounded-2xl ${statusBg} ${statusBorder} border-2 shadow-2xl flex flex-col items-center justify-center text-white font-bold relative transition-transform group-hover:scale-110 ${
          isSelected ? 'ring-4 ring-white' : ''
        }">
              <div class="flex items-center gap-0.5">
                <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z"></path>
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0"></path>
                </svg>
              </div>
              <span class="text-[8px] tracking-tight leading-none">${driver.employeeId.slice(-6)}</span>
              
              <!-- Directional Heading Arrow Indicator -->
              ${
                driver.heading !== null
                  ? `<div class="absolute -top-1.5 -right-1.5 w-4 h-4 bg-black/80 rounded-full flex items-center justify-center shadow" style="transform: rotate(${headingDeg}deg)">
                      <div class="w-0 h-0 border-l-[3px] border-l-transparent border-r-[3px] border-r-transparent border-b-[6px] border-b-[#00C46A]"></div>
                    </div>`
                  : ''
              }
            </div>

            <!-- Label Pill -->
            <div class="absolute -bottom-5 left-1/2 -translate-x-1/2 bg-[#0A1A0F]/95 text-white text-[9px] font-semibold px-2 py-0.5 rounded-full border border-[#243447] whitespace-nowrap shadow-lg flex items-center gap-1">
              <span class="w-1.5 h-1.5 rounded-full ${statusBg}"></span>
              <span>${driver.staffName.split(' ')[0]}</span>
              <span class="text-[#8899AA] font-mono">${speedDisplay}</span>
            </div>
          </div>
        `,
        iconSize: [44, 44],
        iconAnchor: [22, 22],
      });

      const marker = L.marker([driver.latitude, driver.longitude], {
        icon: driverDivIcon,
        zIndexOffset: isSelected ? 1000 : 100,
      });

      marker.on('click', () => {
        setSelectedDriver(driver);
        map.panTo([driver.latitude, driver.longitude], { animate: true });
      });

      // Rich popup content
      const distToDepot = calculateDistanceKm(
        driver.latitude,
        driver.longitude,
        DAR_ES_SALAAM_HUBS.DEPOT_UBUNGO.lat,
        DAR_ES_SALAAM_HUBS.DEPOT_UBUNGO.lng
      );

      const popupHtml = `
        <div class="p-1 font-sans text-[#0A1A0F] min-w-[240px]">
          <div class="flex items-center justify-between pb-1.5 border-b border-gray-200">
            <div>
              <div class="font-bold text-sm text-[#006B3C]">${driver.staffName}</div>
              <div class="text-[11px] text-gray-500 font-mono">${driver.employeeId} • ${driver.phone || ''}</div>
            </div>
            <span class="px-2 py-0.5 text-[10px] font-bold rounded-full uppercase ${
              driver.status === 'en_route'
                ? 'bg-green-100 text-green-800'
                : driver.status === 'at_customer'
                ? 'bg-blue-100 text-blue-800'
                : driver.status === 'depot_reload'
                ? 'bg-amber-100 text-amber-800'
                : 'bg-purple-100 text-purple-800'
            }">
              ${statusLabel}
            </span>
          </div>

          <div class="py-2 space-y-1 text-xs">
            <div class="flex items-center justify-between">
              <span class="text-gray-500">Route:</span>
              <span class="font-semibold text-gray-800">${driver.assignedRoute}</span>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-gray-500">Current Stop:</span>
              <span class="font-semibold text-gray-800 text-right truncate max-w-[140px]">${
                driver.currentStop || 'In Transit'
              }</span>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-gray-500">Telemetry:</span>
              <span class="font-mono font-semibold">${speedDisplay} • ${distToDepot} km to Depot</span>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-gray-500">Truck Inventory:</span>
              <span class="font-mono text-[#007A40] font-bold">
                ${driver.truckStock?.bottles18_9L || 0}x 18.9L | ${driver.truckStock?.bottles13L || 0}x 13L
              </span>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-gray-500">Battery & GPS Acc:</span>
              <span class="font-mono text-gray-700">
                ${driver.batteryLevel !== undefined ? `${driver.batteryLevel}%` : 'N/A'} • ±${driver.accuracy}m
              </span>
            </div>
          </div>
        </div>
      `;

      marker.bindPopup(popupHtml, { maxWidth: 280 });
      markersGroup.addLayer(marker);

      // Add a subtle line connecting driver back to Ubungo Depot
      const routeLine = L.polyline(
        [
          [DAR_ES_SALAAM_HUBS.DEPOT_UBUNGO.lat, DAR_ES_SALAAM_HUBS.DEPOT_UBUNGO.lng],
          [driver.latitude, driver.longitude],
        ],
        {
          color: isSelected ? '#00C46A' : '#3A5068',
          weight: isSelected ? 3 : 1.5,
          opacity: isSelected ? 0.8 : 0.35,
          dashArray: isSelected ? undefined : '4, 8',
        }
      );
      routesGroup.addLayer(routeLine);
    });
  }, [fleet, selectedDriver, statusFilter]);

  // Center on entire fleet
  const handleCenterOnFleet = () => {
    const map = mapInstanceRef.current;
    if (!map || fleet.length === 0) return;

    const bounds = L.latLngBounds([
      [DAR_ES_SALAAM_HUBS.DEPOT_UBUNGO.lat, DAR_ES_SALAAM_HUBS.DEPOT_UBUNGO.lng],
      ...fleet.map((d) => [d.latitude, d.longitude] as [number, number]),
    ]);

    map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
  };

  // Center on Supervisor's Current Device Location via HTML5 Geolocation
  const handleLocateSupervisor = async () => {
    setIsLocatingSupervisor(true);
    setGpsError(null);

    try {
      const pos = await geolocationService.getCurrentPosition();
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;

      if (mapInstanceRef.current) {
        mapInstanceRef.current.flyTo([lat, lng], 15, { duration: 1.5 });

        // Add a pulsing Supervisor Pin
        const supervisorIcon = L.divIcon({
          className: 'supervisor-pulse-marker',
          html: `
            <div class="relative flex items-center justify-center">
              <div class="absolute -inset-3 rounded-full bg-[#00C46A]/30 animate-ping"></div>
              <div class="w-8 h-8 rounded-full bg-[#00C46A] border-2 border-white shadow-xl flex items-center justify-center text-white">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
                </svg>
              </div>
              <div class="absolute -bottom-4 bg-[#0A1A0F] text-[#00C46A] text-[9px] font-bold px-1.5 py-0.2 rounded border border-[#00C46A] whitespace-nowrap shadow">
                Supervisor Device (You)
              </div>
            </div>
          `,
          iconSize: [32, 32],
          iconAnchor: [16, 16],
        });

        const supervisorMarker = L.marker([lat, lng], { icon: supervisorIcon, zIndexOffset: 2000 });
        supervisorMarker.bindPopup(`
          <div class="text-[#0A1A0F] p-1 font-sans">
            <div class="font-bold text-sm text-[#006B3C]">Supervisor Device Location</div>
            <div class="text-xs text-gray-600 mt-0.5">Live GPS Accuracy: &plusmn;${Math.round(pos.coords.accuracy)} meters</div>
            <div class="text-[11px] text-gray-500 mt-1 font-mono">${lat.toFixed(5)}, ${lng.toFixed(5)}</div>
          </div>
        `);

        if (markersLayerRef.current) {
          markersLayerRef.current.addLayer(supervisorMarker);
          supervisorMarker.openPopup();
        }
      }
    } catch (err: any) {
      setGpsError(err?.message || 'Unable to retrieve GPS coordinates.');
    } finally {
      setIsLocatingSupervisor(false);
    }
  };

  // Toggle Fleet Simulation Mode
  const handleToggleSimulation = () => {
    const active = geolocationService.toggleFleetSimulation();
    setIsSimulating(active);
  };

  // Toggle Driver's Own Device Live GPS Broadcasting
  const handleToggleMyGpsBroadcast = async () => {
    if (isMyGpsBroadcasting) {
      geolocationService.stopTracking();
      setIsMyGpsBroadcasting(false);
    } else {
      if (!user) return;
      setGpsError(null);
      const ok = await geolocationService.startTracking(
        user,
        (loc) => {
          setIsMyGpsBroadcasting(true);
          setMyGpsLocation(loc);
        },
        (err) => {
          setGpsError(err.message || 'Geolocation permission denied.');
          setIsMyGpsBroadcasting(false);
        }
      );
      if (ok) {
        setIsMyGpsBroadcasting(true);
      }
    }
  };

  // Focus on a specific driver
  const handleSelectDriver = (driver: FieldTeamLocation) => {
    setSelectedDriver(driver);
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([driver.latitude, driver.longitude], 15, { duration: 1.2 });
    }
  };

  // Calculate fleet summaries
  const totalBottlesInTransit = fleet.reduce(
    (sum, d) => sum + (d.truckStock?.bottles18_9L || 0) + (d.truckStock?.bottles13L || 0),
    0
  );
  const activeEnRouteCount = fleet.filter((d) => d.status === 'en_route').length;
  const atCustomerCount = fleet.filter((d) => d.status === 'at_customer' || d.status === 'delivering').length;
  const depotReloadCount = fleet.filter((d) => d.status === 'depot_reload').length;

  return (
    <div className="space-y-4">
      {/* Top Operations Metrics Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-[#122010] border border-[#2A5038] p-3 rounded-2xl flex items-center gap-3 shadow-sm">
          <div className="w-10 h-10 rounded-xl bg-[#006B3C]/30 text-[#00C46A] border border-[#00C46A]/30 flex items-center justify-center">
            <Truck className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] text-[#8899AA] uppercase tracking-wider font-semibold">
              {isSwahili ? 'Magari Ugani' : 'Active Fleet'}
            </div>
            <div className="text-lg font-bold font-mono text-white">
              {fleet.filter((f) => f.isOnline).length} / {fleet.length}{' '}
              <span className="text-xs text-[#00C46A] font-normal">Online</span>
            </div>
          </div>
        </div>

        <div className="bg-[#122010] border border-[#2A5038] p-3 rounded-2xl flex items-center gap-3 shadow-sm">
          <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/30 flex items-center justify-center">
            <NavIcon className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] text-[#8899AA] uppercase tracking-wider font-semibold">
              {isSwahili ? 'Njia Kuu' : 'En Route / Transit'}
            </div>
            <div className="text-lg font-bold font-mono text-white">
              {activeEnRouteCount}{' '}
              <span className="text-xs text-[#8899AA] font-normal">Trucks</span>
            </div>
          </div>
        </div>

        <div className="bg-[#122010] border border-[#2A5038] p-3 rounded-2xl flex items-center gap-3 shadow-sm">
          <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] text-[#8899AA] uppercase tracking-wider font-semibold">
              {isSwahili ? 'Kwenye Vituo' : 'At Client Drops'}
            </div>
            <div className="text-lg font-bold font-mono text-white">
              {atCustomerCount}{' '}
              <span className="text-xs text-[#8899AA] font-normal">Unloading</span>
            </div>
          </div>
        </div>

        <div className="bg-[#122010] border border-[#2A5038] p-3 rounded-2xl flex items-center gap-3 shadow-sm">
          <div className="w-10 h-10 rounded-xl bg-[#00C46A]/20 text-[#00C46A] border border-[#00C46A]/30 flex items-center justify-center">
            <Package className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] text-[#8899AA] uppercase tracking-wider font-semibold">
              {isSwahili ? 'Mizigo ya Maji' : 'Bottles in Transit'}
            </div>
            <div className="text-lg font-bold font-mono text-[#00C46A]">
              {totalBottlesInTransit}{' '}
              <span className="text-xs text-[#8899AA] font-normal">Bottles</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Map Container Card */}
      <div className="bg-[#122010] border border-[#2A5038] rounded-3xl overflow-hidden shadow-2xl flex flex-col">
        {/* Map Header Controls Bar */}
        <div className="p-3.5 sm:p-4 bg-[#142416] border-b border-[#2A5038] flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#006B3C] text-white flex items-center justify-center border border-[#00C46A]/40 shadow-sm">
              <Radio className="w-5 h-5 text-[#00C46A] animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-bold text-white tracking-wide">
                  {isSwahili ? 'Ufuatiliaji wa Moja kwa Moja wa GPS' : 'Live Field GPS Tracking'}
                </h2>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#00C46A]/20 text-[#00C46A] border border-[#00C46A]/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#00C46A] animate-ping" />
                  <span>Dar es Salaam</span>
                </span>
              </div>
              <p className="text-[11px] text-[#8899AA]">
                {isSwahili
                  ? 'Uwekaji wa ramani kwa wakati halisi wa madereva, mizigo ya maji na maeneo ya wateja'
                  : 'Real-time vehicle telemetry, delivery drop status & route navigation'}
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Filter by Status */}
            <div className="flex items-center gap-1.5 bg-[#1A2E1C] border border-[#3A5068]/50 rounded-xl px-2.5 py-1.5 text-xs text-white">
              <Filter className="w-3.5 h-3.5 text-[#00C46A]" />
              <select
                aria-label="Filter fleet by status"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-transparent text-xs text-white focus:outline-none cursor-pointer pr-1"
              >
                <option value="all" className="bg-[#122010] text-white">
                  {isSwahili ? 'Hali Zote' : 'All Statuses'} ({fleet.length})
                </option>
                <option value="en_route" className="bg-[#122010] text-white">
                  {isSwahili ? 'Njia Kuu' : 'En Route'} ({activeEnRouteCount})
                </option>
                <option value="at_customer" className="bg-[#122010] text-white">
                  {isSwahili ? 'Kwa Mteja' : 'At Customer'} ({atCustomerCount})
                </option>
                <option value="depot_reload" className="bg-[#122010] text-white">
                  {isSwahili ? 'Bohari ya Kupakia' : 'Depot Reload'} ({depotReloadCount})
                </option>
              </select>
            </div>

            {/* Base Layer Switcher */}
            <div className="flex items-center gap-1 bg-[#1A2E1C] border border-[#3A5068]/50 rounded-xl p-0.5 text-xs">
              <button
                type="button"
                onClick={() => handleTileChange('dark')}
                className={`px-2 py-1 rounded-lg font-medium transition-all ${
                  currentTileType === 'dark'
                    ? 'bg-[#006B3C] text-white shadow-sm'
                    : 'text-[#8899AA] hover:text-white'
                }`}
                title="Logistics Dark Map"
              >
                {isSwahili ? 'Giza' : 'Dark'}
              </button>
              <button
                type="button"
                onClick={() => handleTileChange('streets')}
                className={`px-2 py-1 rounded-lg font-medium transition-all ${
                  currentTileType === 'streets'
                    ? 'bg-[#006B3C] text-white shadow-sm'
                    : 'text-[#8899AA] hover:text-white'
                }`}
                title="Street Map"
              >
                {isSwahili ? 'Mtaa' : 'Street'}
              </button>
              <button
                type="button"
                onClick={() => handleTileChange('satellite')}
                className={`px-2 py-1 rounded-lg font-medium transition-all ${
                  currentTileType === 'satellite'
                    ? 'bg-[#006B3C] text-white shadow-sm'
                    : 'text-[#8899AA] hover:text-white'
                }`}
                title="Voyager Daylight Map"
              >
                {isSwahili ? 'Mchana' : 'Daylight'}
              </button>
            </div>

            {/* Locate Me (Supervisor GPS) Button */}
            <button
              type="button"
              onClick={handleLocateSupervisor}
              disabled={isLocatingSupervisor}
              className="flex items-center gap-1.5 bg-[#1A2E1C] hover:bg-[#253D28] text-white border border-[#3A5068]/50 hover:border-[#00C46A] px-3 py-1.5 rounded-xl text-xs font-semibold transition-all disabled:opacity-60 shadow-sm"
              title="Locate supervisor device with Geolocation API"
            >
              <Crosshair className={`w-3.5 h-3.5 text-[#00C46A] ${isLocatingSupervisor ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">{isSwahili ? 'Mahali Pangu' : 'My Location'}</span>
            </button>

            {/* Center on Fleet Button */}
            <button
              type="button"
              onClick={handleCenterOnFleet}
              className="flex items-center gap-1.5 bg-[#1A2E1C] hover:bg-[#253D28] text-white border border-[#3A5068]/50 hover:border-[#00C46A] px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shadow-sm"
              title="Fit map bounds to all active vehicles"
            >
              <Maximize2 className="w-3.5 h-3.5 text-[#00C46A]" />
              <span className="hidden sm:inline">{isSwahili ? 'Onyesha Meli' : 'Fit Fleet'}</span>
            </button>

            {/* Toggle Simulation Engine */}
            <button
              type="button"
              onClick={handleToggleSimulation}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all shadow-sm ${
                isSimulating
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30'
                  : 'bg-[#006B3C] text-white border-[#00C46A]/50 hover:bg-[#008F50]'
              }`}
              title="Simulate vehicle live driving along Dar es Salaam corridors"
            >
              {isSimulating ? (
                <>
                  <Pause className="w-3.5 h-3.5 text-amber-300" />
                  <span>{isSwahili ? 'Uigaji Unaendelea' : 'Simulation Active'}</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 text-[#00C46A]" />
                  <span>{isSwahili ? 'Igiza Mwendo' : 'Simulate Motion'}</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* GPS Error Alert */}
        {gpsError && (
          <div className="bg-red-500/20 border-b border-red-500/40 p-2.5 px-4 flex items-center justify-between text-xs text-red-200">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{gpsError}</span>
            </div>
            <button
              type="button"
              onClick={() => setGpsError(null)}
              className="text-red-300 hover:text-white text-xs font-bold"
            >
              {isSwahili ? 'Ondoa' : 'Dismiss'}
            </button>
          </div>
        )}

        {/* Map Stage + Floating Sidebar Grid */}
        <div className="relative w-full h-[520px] sm:h-[580px] bg-[#0A1A0F]">
          {/* Leaflet Map DOM Node */}
          <div ref={mapContainerRef} className="w-full h-full z-0" />

          {/* Floating Driver Quick-Focus List (Desktop & Tablet) */}
          <div className="absolute top-4 left-4 z-10 w-72 max-h-[480px] hidden md:flex flex-col bg-[#0A1A0F]/90 backdrop-blur-md rounded-2xl border border-[#2A5038] shadow-2xl overflow-hidden">
            <div className="p-3 bg-[#142416] border-b border-[#2A5038] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Truck className="w-4 h-4 text-[#00C46A]" />
                <span className="text-xs font-bold text-white tracking-wide">
                  {isSwahili ? 'Magari ya Meli' : 'Fleet Units'} ({fleet.length})
                </span>
              </div>
              <span className="text-[10px] text-[#8899AA]">
                {isSwahili ? 'Bofya kulenga' : 'Click to focus'}
              </span>
            </div>

            <div className="overflow-y-auto divide-y divide-[#243447]/60 p-1.5 scrollbar-thin">
              {fleet.map((driver) => {
                const isSelected = selectedDriver?.userId === driver.userId;
                return (
                  <button
                    key={driver.userId}
                    type="button"
                    onClick={() => handleSelectDriver(driver)}
                    className={`w-full text-left p-2.5 rounded-xl transition-all flex items-center justify-between gap-2 ${
                      isSelected
                        ? 'bg-[#006B3C]/30 border border-[#00C46A]/40'
                        : 'hover:bg-[#162719] border border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs text-white shrink-0 ${
                          driver.status === 'en_route'
                            ? 'bg-[#006B3C]'
                            : driver.status === 'at_customer'
                            ? 'bg-blue-600'
                            : driver.status === 'depot_reload'
                            ? 'bg-amber-600'
                            : 'bg-purple-600'
                        }`}
                      >
                        {driver.staffName.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="truncate">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-white truncate">{driver.staffName}</span>
                          <span className="font-mono text-[10px] text-[#8899AA]">({driver.employeeId.slice(-6)})</span>
                        </div>
                        <div className="text-[10px] text-[#8899AA] truncate">{driver.assignedRoute}</div>
                        <div className="text-[9px] text-[#00C46A] flex items-center gap-1 mt-0.5">
                          <span>
                            {driver.speed ? `${driver.speed} km/h` : (isSwahili ? 'Kimesimama' : 'Stopped')}
                          </span>
                          <span>•</span>
                          <span className="truncate">
                            {driver.currentStop || (isSwahili ? 'Njiani' : 'In transit')}
                          </span>
                        </div>
                      </div>
                    </div>

                    <ChevronRight
                      className={`w-4 h-4 shrink-0 transition-transform ${
                        isSelected ? 'text-[#00C46A] translate-x-0.5' : 'text-[#8899AA]'
                      }`}
                    />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Floating Driver Broadcast Card (Bottom Left) */}
          <div className="absolute bottom-4 left-4 z-10 bg-[#0A1A0F]/90 backdrop-blur-md p-3 rounded-2xl border border-[#2A5038] shadow-xl flex items-center gap-3">
            <div
              className={`w-3 h-3 rounded-full ${
                isMyGpsBroadcasting ? 'bg-[#00C46A] animate-ping' : 'bg-[#8899AA]'
              }`}
            />
            <div className="text-left">
              <div className="text-xs font-bold text-white flex items-center gap-1.5">
                <span>
                  {isMyGpsBroadcasting
                    ? (isSwahili ? 'GPS Inarusha Mawimbi' : 'GPS Transmitting')
                    : (isSwahili ? 'GPS ya Kifaa Iko Tayari' : 'Device GPS Standby')}
                </span>
                {isMyGpsBroadcasting && (
                  <span className="text-[9px] bg-[#00C46A]/20 text-[#00C46A] px-1.5 py-0.2 rounded border border-[#00C46A]/40 font-mono">
                    LIVE
                  </span>
                )}
              </div>
              <div className="text-[10px] text-[#8899AA]">
                {isMyGpsBroadcasting && myGpsLocation
                  ? `Lat: ${myGpsLocation.latitude.toFixed(4)} | Acc: ±${myGpsLocation.accuracy}m`
                  : (isSwahili
                      ? 'Washa ili kurusha mahali ulipo kwa wasimamizi'
                      : 'Turn on to broadcast your field position to supervisors')}
              </div>
            </div>

            <button
              type="button"
              onClick={handleToggleMyGpsBroadcast}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow ${
                isMyGpsBroadcasting
                  ? 'bg-red-500/20 text-red-300 border border-red-500/40 hover:bg-red-500/30'
                  : 'bg-[#006B3C] text-white hover:bg-[#008F50] border border-[#00C46A]/40'
              }`}
            >
              {isMyGpsBroadcasting
                ? (isSwahili ? 'Sitisha GPS' : 'Stop GPS')
                : (isSwahili ? 'Washa GPS' : 'Transmit GPS')}
            </button>
          </div>

          {/* Map Legend Overlay (Bottom Right) */}
          <div className="absolute bottom-4 right-4 z-10 bg-[#0A1A0F]/90 backdrop-blur-md p-2.5 rounded-2xl border border-[#2A5038] shadow-xl hidden sm:flex items-center gap-3 text-[10px] text-[#8899AA]">
            <div className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-[#00C46A]" />
              <span className="text-white">{isSwahili ? 'Njiani' : 'En Route'}</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-[#3B82F6]" />
              <span className="text-white">{isSwahili ? 'Kwa Mteja' : 'At Customer'}</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-[#A855F7]" />
              <span className="text-white">{isSwahili ? 'Inashusha' : 'Delivering'}</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-[#F59E0B]" />
              <span className="text-white">{isSwahili ? 'Kupakia Bohari' : 'Depot Reload'}</span>
            </div>
          </div>
        </div>

        {/* Selected Driver Deep-Dive Footer Card */}
        {selectedDriver && (
          <div className="p-4 bg-[#142416] border-t border-[#2A5038] flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-fade-in">
            <div className="flex items-center gap-3">
              <div
                className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-sm text-white shadow-md border ${
                  selectedDriver.status === 'en_route'
                    ? 'bg-[#006B3C] border-[#00C46A]'
                    : selectedDriver.status === 'at_customer'
                    ? 'bg-blue-600 border-blue-400'
                    : 'bg-amber-600 border-amber-400'
                }`}
              >
                {selectedDriver.staffName.slice(0, 2).toUpperCase()}
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-white">{selectedDriver.staffName}</h3>
                  <span className="text-xs font-mono text-[#00C46A] bg-[#006B3C]/30 px-2 py-0.5 rounded-md border border-[#00C46A]/30">
                    {selectedDriver.employeeId}
                  </span>
                  <span className="text-[11px] text-[#8899AA] font-mono">
                    {selectedDriver.speed
                      ? `${selectedDriver.speed} km/h`
                      : (isSwahili ? 'Kimesimama' : 'Stopped')}
                  </span>
                </div>
                <div className="text-xs text-[#8899AA] mt-0.5">
                  {isSwahili ? 'Njia:' : 'Route:'}{' '}
                  <strong className="text-white">{selectedDriver.assignedRoute}</strong> &bull;{' '}
                  {isSwahili ? 'Kituo cha Sasa:' : 'Current Stop:'}{' '}
                  <strong className="text-[#00C46A]">
                    {selectedDriver.currentStop || (isSwahili ? 'Njiani' : 'In transit')}
                  </strong>
                </div>
              </div>
            </div>

            {/* Quick Metrics & Actions */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="bg-[#1A2E1C] px-3 py-1.5 rounded-xl border border-[#3A5068]/40 text-center">
                <div className="text-[10px] text-[#8899AA]">
                  {isSwahili ? 'Mizigo ya Gari' : 'Truck Stock'}
                </div>
                <div className="font-mono text-xs font-bold text-white">
                  {selectedDriver.truckStock?.bottles18_9L || 0}x 18.9L | {selectedDriver.truckStock?.bottles13L || 0}x 13L
                </div>
              </div>

              <div className="bg-[#1A2E1C] px-3 py-1.5 rounded-xl border border-[#3A5068]/40 text-center">
                <div className="text-[10px] text-[#8899AA]">
                  {isSwahili ? 'Betri ya Simu' : 'Phone Battery'}
                </div>
                <div className="font-mono text-xs font-bold text-white flex items-center justify-center gap-1">
                  <Battery className="w-3.5 h-3.5 text-[#00C46A]" />
                  <span>{selectedDriver.batteryLevel || 85}%</span>
                </div>
              </div>

              {selectedDriver.phone && (
                <a
                  href={`tel:${selectedDriver.phone}`}
                  className="bg-[#1A2E1C] hover:bg-[#253D28] text-white border border-[#3A5068] hover:border-[#00C46A] px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm"
                >
                  <Phone className="w-3.5 h-3.5 text-[#00C46A]" />
                  <span>{isSwahili ? 'Piga Simu' : 'Call Driver'}</span>
                </a>
              )}

              {onNavigate && (
                <button
                  type="button"
                  onClick={() => onNavigate('messages')}
                  className="bg-[#006B3C] hover:bg-[#008F50] text-white px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm"
                >
                  <MessageSquare className="w-3.5 h-3.5 text-[#00C46A]" />
                  <span>{isSwahili ? 'Tuma Ujumbe' : 'Send Message'}</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
