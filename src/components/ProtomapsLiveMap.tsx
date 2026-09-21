import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { leafletLayer } from 'protomaps-leaflet';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import {
  geolocationService,
  MWANZA_HUBS,
  calculateDistanceKm,
} from '../services/geolocation';
import { FieldTeamLocation } from '../types';
import {
  Truck,
  MapPin,
  Navigation as NavIcon,
  Compass,
  Layers,
  Radio,
  RefreshCw,
  Sparkles,
  Zap,
  Building2,
  Maximize2,
  CheckCircle2,
  Phone,
  MessageSquare,
  Package,
  Activity,
  Battery,
  AlertCircle,
  X,
  Crosshair,
} from 'lucide-react';

interface ProtomapsLiveMapProps {
  onNavigate?: (view: string) => void;
  className?: string;
  height?: string | number;
}

// Protomaps Vector Tile API Key & Endpoint
export const PROTOMAPS_API_KEY =
  (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_PROTOMAPS_API_KEY) ||
  'c67afbf0807f68f3';

export const PROTOMAPS_MVT_URL = `https://api.protomaps.com/tiles/v3/{z}/{x}/{y}.mvt?key=${PROTOMAPS_API_KEY}`;

// Mwanza, Tanzania Geographic Coordinates & Bounds
export const MWANZA_CENTER: [number, number] = [-2.5164, 32.9000];
export const MWANZA_DEFAULT_ZOOM = 13;

// Active Mwanza Operations Zone Boundary (Lake Victoria Corridor)
export const MWANZA_OPERATIONS_ZONE_POLYGON: [number, number][] = [
  [-2.4720, 32.9080], // North: Pasiansi & Mwanza Airport Approach
  [-2.4850, 32.9380], // North-East: Nyamanoro & Bwiru Ridge
  [-2.5200, 32.9850], // East: Igoma Industrial Hub & Musoma Hwy
  [-2.5520, 32.9800], // South-East: Mahina & Kishiri Border
  [-2.5780, 32.9150], // South: Nyegezi Transit Terminal & Butimba
  [-2.5680, 32.8820], // South-West: Lake Victoria Shoreline & Sweya
  [-2.5220, 32.8760], // West: Capripoint & Tilapia Bay Waterfront
  [-2.4880, 32.8880], // North-West: Kirumba Bay & Stadium Sector
];

export type ProtomapsThemeKey =
  | 'protomaps_dark'
  | 'protomaps_light'
  | 'protomaps_grayscale'
  | 'protomaps_white'
  | 'carto_dark';

interface MapThemeConfig {
  id: ProtomapsThemeKey;
  label: string;
  isVector: boolean;
  flavor?: string;
  rasterUrl?: string;
  attribution: string;
}

const MAP_THEMES: Record<ProtomapsThemeKey, MapThemeConfig> = {
  protomaps_dark: {
    id: 'protomaps_dark',
    label: 'Dark Vector',
    isVector: true,
    flavor: 'dark',
    attribution: '&copy; <a href="https://protomaps.com" target="_blank" rel="noreferrer">Protomaps</a> &copy; <a href="https://openstreetmap.org" target="_blank" rel="noreferrer">OpenStreetMap</a>',
  },
  protomaps_light: {
    id: 'protomaps_light',
    label: 'Light Vector',
    isVector: true,
    flavor: 'light',
    attribution: '&copy; <a href="https://protomaps.com" target="_blank" rel="noreferrer">Protomaps</a> &copy; <a href="https://openstreetmap.org" target="_blank" rel="noreferrer">OpenStreetMap</a>',
  },
  protomaps_grayscale: {
    id: 'protomaps_grayscale',
    label: 'Grayscale',
    isVector: true,
    flavor: 'grayscale',
    attribution: '&copy; <a href="https://protomaps.com" target="_blank" rel="noreferrer">Protomaps</a> &copy; <a href="https://openstreetmap.org" target="_blank" rel="noreferrer">OpenStreetMap</a>',
  },
  protomaps_white: {
    id: 'protomaps_white',
    label: 'High Contrast',
    isVector: true,
    flavor: 'white',
    attribution: '&copy; <a href="https://protomaps.com" target="_blank" rel="noreferrer">Protomaps</a> &copy; <a href="https://openstreetmap.org" target="_blank" rel="noreferrer">OpenStreetMap</a>',
  },
  carto_dark: {
    id: 'carto_dark',
    label: 'Fallback Raster',
    isVector: false,
    rasterUrl: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://carto.com/">CARTO</a> &copy; OpenStreetMap contributors',
  },
};

export const ProtomapsLiveMap: React.FC<ProtomapsLiveMapProps> = ({
  onNavigate,
  className = '',
  height = 420,
}) => {
  const { isSwahili } = useLanguage();
  const { user } = useAuth();
  const { isSunlight } = useTheme();

  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const activeTileLayerRef = useRef<any>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const hubsLayerRef = useRef<L.LayerGroup | null>(null);
  const routesLayerRef = useRef<L.LayerGroup | null>(null);
  const geofenceLayerRef = useRef<L.Polygon | null>(null);
  const myLocationMarkerRef = useRef<L.Marker | null>(null);

  // Map state
  const [fleet, setFleet] = useState<FieldTeamLocation[]>([]);
  const [selectedDriver, setSelectedDriver] = useState<FieldTeamLocation | null>(null);
  const [selectedHub, setSelectedHub] = useState<any | null>(null);
  const [currentTheme, setCurrentTheme] = useState<ProtomapsThemeKey>(
    isSunlight ? 'protomaps_light' : 'protomaps_dark'
  );
  const [showHubs, setShowHubs] = useState<boolean>(true);
  const [showZoneBoundary, setShowZoneBoundary] = useState<boolean>(true);
  const [showRoutes, setShowRoutes] = useState<boolean>(true);
  const [isGpsBroadcasting, setIsGpsBroadcasting] = useState<boolean>(false);
  const [myGpsCoords, setMyGpsCoords] = useState<any>(null);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());
  const [isLocating, setIsLocating] = useState<boolean>(false);

  // Sync theme when sunlight mode toggles
  useEffect(() => {
    const desiredTheme = isSunlight ? 'protomaps_light' : 'protomaps_dark';
    if (desiredTheme !== currentTheme) {
      handleThemeChange(desiredTheme);
    }
  }, [isSunlight]);

  // Mount tile layer (Vector tiles from Protomaps via API key)
  const mountTileLayer = (map: L.Map, themeKey: ProtomapsThemeKey) => {
    if (activeTileLayerRef.current) {
      try {
        activeTileLayerRef.current.remove();
      } catch {
        // ignore
      }
      activeTileLayerRef.current = null;
    }

    const config = MAP_THEMES[themeKey] || MAP_THEMES.protomaps_dark;

    if (config.isVector) {
      try {
        const pLayer = leafletLayer({
          url: PROTOMAPS_MVT_URL,
          flavor: config.flavor || 'dark',
          attribution: config.attribution,
          maxDataZoom: 16,
        });
        pLayer.addTo(map);
        activeTileLayerRef.current = pLayer;
      } catch (err) {
        console.warn('Protomaps vector tile initialization error, switching to raster fallback:', err);
        const fallback = L.tileLayer(MAP_THEMES.carto_dark.rasterUrl!, {
          attribution: MAP_THEMES.carto_dark.attribution,
          maxZoom: 19,
          subdomains: 'abcd',
        }).addTo(map);
        activeTileLayerRef.current = fallback;
      }
    } else {
      const rasterLayer = L.tileLayer(config.rasterUrl!, {
        attribution: config.attribution,
        maxZoom: 19,
        subdomains: 'abcd',
      }).addTo(map);
      activeTileLayerRef.current = rasterLayer;
    }
  };

  // Initialize Map on mount
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: MWANZA_CENTER,
      zoom: MWANZA_DEFAULT_ZOOM,
      zoomControl: false,
      attributionControl: false,
      minZoom: 10,
      maxZoom: 18,
    });

    // Custom attribution & controls
    L.control.attribution({ position: 'bottomright', prefix: false }).addTo(map);
    L.control.zoom({ position: 'topright' }).addTo(map);

    // Mount initial Protomaps layer
    mountTileLayer(map, currentTheme);

    // Create persistent layer groups
    const geofence = L.polygon(MWANZA_OPERATIONS_ZONE_POLYGON, {
      color: '#00C46A',
      weight: 2,
      dashArray: '5, 8',
      fillColor: '#006B3C',
      fillOpacity: 0.08,
      interactive: true,
    }).addTo(map);

    geofence.bindTooltip(
      '<strong>Mwanza Operations Zone</strong><br/>Lake Victoria Logistics Corridor',
      { permanent: false, direction: 'center', className: 'mwanza-zone-tooltip' }
    );
    geofenceLayerRef.current = geofence;

    const routesGroup = L.layerGroup().addTo(map);
    const hubsGroup = L.layerGroup().addTo(map);
    const markersGroup = L.layerGroup().addTo(map);

    routesLayerRef.current = routesGroup;
    hubsLayerRef.current = hubsGroup;
    markersLayerRef.current = markersGroup;
    mapInstanceRef.current = map;

    // Responsive container resize observer
    const resizeObserver = new ResizeObserver(() => {
      map.invalidateSize();
    });
    resizeObserver.observe(mapContainerRef.current);

    // Initial map layout refresh
    setTimeout(() => {
      map.invalidateSize();
    }, 150);

    return () => {
      resizeObserver.disconnect();
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Theme change handler
  const handleThemeChange = (newTheme: ProtomapsThemeKey) => {
    if (!mapInstanceRef.current) return;
    setCurrentTheme(newTheme);
    mountTileLayer(mapInstanceRef.current, newTheme);
  };

  // Subscribe to Geolocation Service (Fleet & User)
  useEffect(() => {
    const unsubFleet = geolocationService.subscribeToFleet((locations) => {
      setFleet(locations);
      setLastRefreshed(new Date());
    });

    setIsGpsBroadcasting(geolocationService.isTrackingActive());
    const unsubMyGps = geolocationService.subscribeToCurrentLocation((loc) => {
      setMyGpsCoords(loc);
      setIsGpsBroadcasting(geolocationService.isTrackingActive());
    });

    return () => {
      unsubFleet();
      unsubMyGps();
    };
  }, []);

  // Render Hubs (Mwanza Central Depot Nyakato & Substations)
  useEffect(() => {
    const hubsGroup = hubsLayerRef.current;
    if (!hubsGroup) return;

    hubsGroup.clearLayers();
    if (!showHubs) return;

    // 1. Central Bottling Plant & Depot (Nyakato)
    const nyakato = MWANZA_HUBS.DEPOT_NYAKATO;
    const depotIcon = L.divIcon({
      className: 'mwanza-depot-marker',
      html: `
        <div class="relative flex items-center justify-center cursor-pointer group select-none">
          <div class="absolute -inset-3 rounded-full bg-[#00C46A]/20 animate-ping"></div>
          <div class="w-10 h-10 rounded-2xl bg-[#006B3C] border-2 border-[#00C46A] shadow-2xl flex flex-col items-center justify-center text-white transition-transform group-hover:scale-110">
            <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path>
            </svg>
          </div>
          <div class="absolute -bottom-5 bg-[#0A1A0F]/95 text-[#00C46A] text-[9px] font-bold px-2 py-0.5 rounded-full border border-[#00C46A]/50 whitespace-nowrap shadow-lg flex items-center gap-1">
            <span class="w-1.5 h-1.5 rounded-full bg-[#00C46A]"></span>
            <span>CENTRAL BOTTLING PLANT</span>
          </div>
        </div>
      `,
      iconSize: [40, 40],
      iconAnchor: [20, 20],
    });

    const depotMarker = L.marker([nyakato.lat, nyakato.lng], {
      icon: depotIcon,
      zIndexOffset: 600,
    });

    depotMarker.on('click', () => {
      setSelectedHub(nyakato);
      setSelectedDriver(null);
    });

    depotMarker.bindPopup(`
      <div class="text-[#0A1A0F] font-sans p-1.5 min-w-[240px]">
        <div class="font-bold text-sm text-[#006B3C] flex items-center gap-1.5">
          <span>${nyakato.name}</span>
        </div>
        <div class="text-xs text-gray-600 mt-0.5">${nyakato.address}</div>
        <div class="mt-2 pt-2 border-t border-gray-200 space-y-1 text-[11px]">
          <div class="flex justify-between"><strong>Role:</strong> <span class="text-gray-700">${nyakato.role}</span></div>
          <div class="flex justify-between"><strong>Stock Capacity:</strong> <span class="text-[#007A40] font-bold">${nyakato.capacity}</span></div>
          <div class="flex justify-between"><strong>Dispatch Status:</strong> <span class="text-[#007A40] font-semibold">Active Ready</span></div>
        </div>
      </div>
    `);
    hubsGroup.addLayer(depotMarker);

    // 2. Mwanza Regional Distribution Stations
    const subHubs = [
      MWANZA_HUBS.CAPRIPOINT_WATERFRONT,
      MWANZA_HUBS.POSTA_CBD,
      MWANZA_HUBS.BUZURUGA_PLAZA,
      MWANZA_HUBS.KIRUMBA_STADIUM,
      MWANZA_HUBS.PASIANSI_AIRPORT,
      MWANZA_HUBS.NYEGEZI_TERMINAL,
      MWANZA_HUBS.IGOMA_JUNCTION,
    ];

    subHubs.forEach((hub) => {
      const hubIcon = L.divIcon({
        className: 'mwanza-subhub-marker',
        html: `
          <div class="relative flex items-center justify-center cursor-pointer group select-none">
            <div class="w-8 h-8 rounded-xl bg-[#122010] border border-[#00C46A]/60 shadow-lg flex items-center justify-center text-[#00C46A] group-hover:scale-110 transition-transform">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path>
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path>
              </svg>
            </div>
            <div class="absolute -bottom-4 bg-[#0A1A0F]/90 text-gray-200 text-[8px] font-semibold px-1.5 py-0.2 rounded border border-[#243447] whitespace-nowrap shadow">
              ${hub.shortName}
            </div>
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });

      const marker = L.marker([hub.lat, hub.lng], {
        icon: hubIcon,
        zIndexOffset: 300,
      });

      marker.on('click', () => {
        setSelectedHub(hub);
        setSelectedDriver(null);
      });

      marker.bindPopup(`
        <div class="text-[#0A1A0F] font-sans p-1 min-w-[210px]">
          <div class="font-bold text-xs text-[#006B3C]">${hub.name}</div>
          <div class="text-[11px] text-gray-600 mt-0.5">${hub.address}</div>
          <div class="mt-1.5 pt-1.5 border-t border-gray-200 text-[10px] space-y-0.5 text-gray-700">
            <div><strong>Role:</strong> ${hub.role}</div>
            <div><strong>Buffer Capacity:</strong> ${hub.capacity}</div>
          </div>
        </div>
      `);
      hubsGroup.addLayer(marker);
    });
  }, [showHubs]);

  // Render Fleet Markers & Route Polylines in Mwanza
  useEffect(() => {
    const map = mapInstanceRef.current;
    const markersGroup = markersLayerRef.current;
    const routesGroup = routesLayerRef.current;

    if (!map || !markersGroup || !routesGroup) return;

    markersGroup.clearLayers();
    routesGroup.clearLayers();

    const nyakato = MWANZA_HUBS.DEPOT_NYAKATO;

    fleet.forEach((driver) => {
      const isSelected = selectedDriver?.userId === driver.userId;

      // Status Colors
      let statusBg = 'bg-[#00C46A]';
      let statusBorder = 'border-[#00C46A]';
      let ringColor = 'bg-[#00C46A]/30';

      if (driver.status === 'at_customer') {
        statusBg = 'bg-[#3B82F6]';
        statusBorder = 'border-[#60A5FA]';
        ringColor = 'bg-blue-500/30';
      } else if (driver.status === 'delivering') {
        statusBg = 'bg-[#A855F7]';
        statusBorder = 'border-[#C084FC]';
        ringColor = 'bg-purple-500/30';
      } else if (driver.status === 'depot_reload') {
        statusBg = 'bg-[#F59E0B]';
        statusBorder = 'border-[#FBBF24]';
        ringColor = 'bg-amber-500/30';
      } else if (driver.status === 'idle' || !driver.isOnline) {
        statusBg = 'bg-[#64748B]';
        statusBorder = 'border-[#94A3B8]';
        ringColor = 'bg-gray-500/20';
      }

      const speedDisplay = driver.speed ? `${driver.speed} km/h` : 'Stopped';

      const driverIcon = L.divIcon({
        className: 'fleet-driver-pin',
        html: `
          <div class="relative cursor-pointer group select-none">
            ${
              driver.speed && driver.speed > 5
                ? `<div class="absolute -inset-2 rounded-full ${ringColor} animate-ping"></div>`
                : ''
            }
            <div class="w-10 h-10 rounded-2xl ${statusBg} ${statusBorder} border-2 shadow-2xl flex flex-col items-center justify-center text-white font-bold relative transition-transform group-hover:scale-110 ${
          isSelected ? 'ring-4 ring-white shadow-emerald-500/50' : ''
        }">
              <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z"></path>
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0"></path>
              </svg>
              <span class="text-[7.5px] tracking-tight leading-none">${driver.employeeId.slice(-6)}</span>
            </div>
            <div class="absolute -bottom-5 left-1/2 -translate-x-1/2 bg-[#0A1A0F]/95 text-white text-[9px] font-semibold px-2 py-0.5 rounded-full border border-[#243447] whitespace-nowrap shadow-lg flex items-center gap-1">
              <span class="w-1.5 h-1.5 rounded-full ${statusBg}"></span>
              <span>${driver.staffName.split(' ')[0]}</span>
              <span class="text-[#8899AA] font-mono">${speedDisplay}</span>
            </div>
          </div>
        `,
        iconSize: [40, 40],
        iconAnchor: [20, 20],
      });

      const marker = L.marker([driver.latitude, driver.longitude], {
        icon: driverIcon,
        zIndexOffset: isSelected ? 1000 : 200,
      });

      marker.on('click', () => {
        setSelectedDriver(driver);
        setSelectedHub(null);
        map.panTo([driver.latitude, driver.longitude], { animate: true });
      });

      marker.bindPopup(`
        <div class="text-[#0A1A0F] font-sans p-1 min-w-[220px]">
          <div class="flex items-center justify-between gap-2 border-b border-gray-200 pb-1">
            <span class="font-bold text-xs text-[#006B3C]">${driver.staffName}</span>
            <span class="text-[10px] font-mono px-1.5 py-0.5 bg-gray-100 rounded text-gray-800 font-bold">${driver.employeeId}</span>
          </div>
          <div class="text-[11px] text-gray-700 mt-1 space-y-0.5">
            <div><strong>Current Stop:</strong> ${driver.currentStop || 'In Transit'}</div>
            <div><strong>Route:</strong> ${driver.assignedRoute || 'Mwanza Central'}</div>
            <div><strong>Stock:</strong> ${driver.truckStock?.bottles18_9L ?? 0}x 18.9L | ${driver.truckStock?.bottles13L ?? 0}x 13L</div>
            <div class="flex justify-between items-center text-[10px] text-gray-500 pt-1">
              <span>Speed: ${speedDisplay}</span>
              <span>Battery: ${driver.batteryLevel ?? 90}%</span>
            </div>
          </div>
        </div>
      `);

      markersGroup.addLayer(marker);

      // Route Polyline from Nyakato Bottling Depot to active truck
      if (showRoutes && driver.isOnline && driver.status !== 'idle') {
        const polyline = L.polyline(
          [
            [nyakato.lat, nyakato.lng],
            [driver.latitude, driver.longitude],
          ],
          {
            color: driver.status === 'at_customer' ? '#3B82F6' : '#00C46A',
            weight: isSelected ? 3 : 2,
            opacity: isSelected ? 0.9 : 0.45,
            dashArray: '6, 8',
          }
        );
        routesGroup.addLayer(polyline);
      }
    });
  }, [fleet, selectedDriver, showRoutes]);

  // Render / Update My Location GPS beacon
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (myLocationMarkerRef.current) {
      myLocationMarkerRef.current.remove();
      myLocationMarkerRef.current = null;
    }

    if (myGpsCoords) {
      const myIcon = L.divIcon({
        className: 'my-location-marker',
        html: `
          <div class="relative flex items-center justify-center select-none">
            <div class="absolute -inset-3 rounded-full bg-emerald-400/30 animate-ping"></div>
            <div class="w-7 h-7 rounded-full bg-[#00C46A] border-2 border-white shadow-xl flex items-center justify-center text-[#0A1A0F]">
              <div class="w-2.5 h-2.5 rounded-full bg-white"></div>
            </div>
            <div class="absolute -bottom-4 bg-[#0A1A0F]/90 text-white text-[8px] font-bold px-1.5 py-0.5 rounded border border-[#00C46A]/40 whitespace-nowrap shadow">
              You
            </div>
          </div>
        `,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      });

      const marker = L.marker([myGpsCoords.latitude, myGpsCoords.longitude], {
        icon: myIcon,
        zIndexOffset: 1200,
      }).addTo(map);

      marker.bindPopup(`
        <div class="text-[#0A1A0F] font-sans p-1 text-xs">
          <strong>Your Transmitted GPS Location</strong>
          <div class="text-[10px] text-gray-600 mt-0.5">
            ${myGpsCoords.latitude.toFixed(5)}, ${myGpsCoords.longitude.toFixed(5)} (±${myGpsCoords.accuracy}m)
          </div>
        </div>
      `);

      myLocationMarkerRef.current = marker;
    }
  }, [myGpsCoords]);

  // Toggle Geofence boundary visibility
  useEffect(() => {
    if (geofenceLayerRef.current) {
      if (showZoneBoundary) {
        geofenceLayerRef.current.setStyle({ opacity: 1, fillOpacity: 0.08 });
      } else {
        geofenceLayerRef.current.setStyle({ opacity: 0, fillOpacity: 0 });
      }
    }
  }, [showZoneBoundary]);

  // Map Navigation Helper: Fit Mwanza Operations Zone
  const handleFitMwanzaArea = () => {
    const map = mapInstanceRef.current;
    if (!map) return;
    map.flyTo(MWANZA_CENTER, MWANZA_DEFAULT_ZOOM, {
      duration: 1.2,
      easeLinearity: 0.25,
    });
  };

  // Center on Nyakato Central Depot
  const handleFocusCentralDepot = () => {
    const map = mapInstanceRef.current;
    if (!map) return;
    const nyakato = MWANZA_HUBS.DEPOT_NYAKATO;
    map.flyTo([nyakato.lat, nyakato.lng], 15, {
      duration: 1.2,
    });
  };

  // Locate User / Center on User GPS
  const handleLocateMe = async () => {
    setIsLocating(true);
    try {
      if (!isGpsBroadcasting && user) {
        await geolocationService.startTracking(user, (loc) => {
          setMyGpsCoords(loc);
          setIsGpsBroadcasting(true);
          if (mapInstanceRef.current) {
            mapInstanceRef.current.flyTo([loc.latitude, loc.longitude], 15);
          }
        });
      } else if (myGpsCoords && mapInstanceRef.current) {
        mapInstanceRef.current.flyTo([myGpsCoords.latitude, myGpsCoords.longitude], 15);
      }
    } catch {
      // ignore
    } finally {
      setIsLocating(false);
    }
  };

  // Distance of selected driver from Nyakato Plant
  const selectedDriverDistance =
    selectedDriver
      ? calculateDistanceKm(
          MWANZA_HUBS.DEPOT_NYAKATO.lat,
          MWANZA_HUBS.DEPOT_NYAKATO.lng,
          selectedDriver.latitude,
          selectedDriver.longitude
        )
      : null;

  return (
    <div className={`bg-[#122010] rounded-2xl border border-[#2A5038] shadow-xl overflow-hidden relative flex flex-col ${className}`}>
      {/* 1. Header Toolbar */}
      <div className="p-4 sm:p-5 border-b border-[#2A5038] flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#0E1A0E]">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-[#006B3C]/30 text-[#00C46A] border border-[#00C46A]/30">
              <Compass className="w-4 h-4" />
            </div>
            <h2 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
              <span>{isSwahili ? 'Ramani ya Ugani Mwanza' : 'Mwanza Operations Area Live Map'}</span>
              <span className="text-[10px] font-mono font-bold bg-[#006B3C]/40 text-[#00C46A] px-2 py-0.5 rounded-full border border-[#00C46A]/30 uppercase tracking-wider">
                Protomaps Vector
              </span>
            </h2>
          </div>
          <p className="text-xs text-[#8899AA] mt-1 flex items-center gap-2 flex-wrap">
            <span>Lake Victoria Corridor</span>
            <span>&bull;</span>
            <span>Center: Nyakato Central RO Bottling Plant</span>
            <span>&bull;</span>
            <span className="text-[#00C46A] font-semibold flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-[#00C46A] animate-pulse"></span>
              <span>{fleet.filter((d) => d.isOnline).length} Trucks Live</span>
            </span>
          </p>
        </div>

        {/* Action Controls & Theme Selector */}
        <div className="flex items-center gap-2 flex-wrap self-end sm:self-auto">
          {/* Theme Dropdown / Pill Switcher */}
          <div className="flex items-center bg-[#1A2E1C] p-1 rounded-xl border border-[#3A5068]/60">
            {(['protomaps_dark', 'protomaps_light', 'protomaps_grayscale'] as const).map((themeKey) => (
              <button
                key={themeKey}
                type="button"
                onClick={() => handleThemeChange(themeKey)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all ${
                  currentTheme === themeKey
                    ? 'bg-[#006B3C] text-white shadow-xs font-semibold'
                    : 'text-[#8899AA] hover:text-white'
                }`}
              >
                {MAP_THEMES[themeKey].label.split(' ')[0]}
              </button>
            ))}
          </div>

          {/* Quick Area Focus */}
          <button
            type="button"
            onClick={handleFitMwanzaArea}
            title="Reset view to Mwanza Operations Zone"
            className="p-2 rounded-xl bg-[#1A2E1C] hover:bg-[#253D28] text-white border border-[#3A5068]/60 hover:border-[#00C46A] transition-all"
          >
            <Crosshair className="w-4 h-4 text-[#00C46A]" />
          </button>

          {/* Open Full Supervisor View Button (if onNavigate provided) */}
          {onNavigate && (
            <button
              type="button"
              onClick={() => onNavigate('supervisor')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#006B3C] hover:bg-[#008F50] text-white text-xs font-bold transition-all shadow-sm"
              title="Open full supervisor operations command map"
            >
              <Maximize2 className="w-3.5 h-3.5" />
              <span className="hidden md:inline">{isSwahili ? 'Ramani Kamili' : 'Full Map'}</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. Interactive Map View Canvas */}
      <div className="relative w-full overflow-hidden" style={{ height: typeof height === 'number' ? `${height}px` : height }}>
        <div ref={mapContainerRef} className="w-full h-full z-0 bg-[#0A1A0F]" />

        {/* Floating Quick Action Overlay (Top Left inside Map) */}
        <div className="absolute top-3 left-3 z-[400] flex flex-col gap-2">
          {/* Operations Hubs Toggle */}
          <button
            type="button"
            onClick={() => setShowHubs(!showHubs)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold shadow-lg backdrop-blur-md transition-all border ${
              showHubs
                ? 'bg-[#0A1A0F]/90 text-[#00C46A] border-[#00C46A]/50'
                : 'bg-[#0A1A0F]/70 text-[#8899AA] border-[#243447]'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>{isSwahili ? 'Vituo 8' : '8 Stations'}</span>
          </button>

          {/* Zone Geofence Toggle */}
          <button
            type="button"
            onClick={() => setShowZoneBoundary(!showZoneBoundary)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold shadow-lg backdrop-blur-md transition-all border ${
              showZoneBoundary
                ? 'bg-[#0A1A0F]/90 text-white border-[#00C46A]/40'
                : 'bg-[#0A1A0F]/70 text-[#8899AA] border-[#243447]'
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-[#00C46A]" />
            <span>Mwanza Zone</span>
          </button>

          {/* Focus Nyakato Depot */}
          <button
            type="button"
            onClick={handleFocusCentralDepot}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold shadow-lg backdrop-blur-md bg-[#0A1A0F]/90 text-white hover:text-[#00C46A] border border-[#243447] hover:border-[#00C46A]/40 transition-all"
          >
            <MapPin className="w-3.5 h-3.5 text-[#00C46A]" />
            <span>Nyakato Plant</span>
          </button>
        </div>

        {/* Floating Live Telemetry Badge (Bottom Left) */}
        <div className="absolute bottom-3 left-3 z-[400] bg-[#0A1A0F]/90 backdrop-blur-md p-2.5 rounded-xl border border-[#2A5038] shadow-xl max-w-xs text-[11px] hidden sm:block">
          <div className="flex items-center justify-between gap-4 font-semibold text-white mb-1">
            <span className="flex items-center gap-1.5 text-[#00C46A]">
              <Radio className="w-3 h-3 animate-pulse" />
              <span>Telemetry Active</span>
            </span>
            <span className="text-[10px] text-[#8899AA] font-mono">
              Key: c67afbf08...
            </span>
          </div>
          <div className="text-[10px] text-[#8899AA] flex items-center justify-between gap-3 pt-1 border-t border-[#243447]">
            <span>Active Sector: Mwanza CBD & Industrial</span>
            <span className="text-white font-mono">{lastRefreshed.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
          </div>
        </div>

        {/* Floating Inspection Card when a Driver or Hub is Selected */}
        {selectedDriver && (
          <div className="absolute bottom-3 right-3 sm:right-4 z-[500] w-[calc(100%-24px)] sm:w-80 bg-[#0A1A0F]/95 backdrop-blur-md p-4 rounded-2xl border border-[#00C46A]/60 shadow-2xl animate-fade-in text-xs">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-[#006B3C] text-white flex items-center justify-center font-bold">
                  <Truck className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-white text-sm">{selectedDriver.staffName}</h4>
                  <div className="text-[11px] text-[#8899AA] font-mono">{selectedDriver.employeeId}</div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedDriver(null)}
                className="p-1 rounded-lg text-[#8899AA] hover:text-white hover:bg-[#1A2E1C]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-3 space-y-1.5 pt-2 border-t border-[#243447] text-[11px]">
              <div className="flex justify-between">
                <span className="text-[#8899AA]">Current Stop:</span>
                <span className="font-semibold text-white truncate max-w-[180px]">{selectedDriver.currentStop || 'In Transit'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#8899AA]">Route Corridor:</span>
                <span className="text-[#00C46A] truncate max-w-[180px]">{selectedDriver.assignedRoute}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#8899AA]">Truck Inventory:</span>
                <span className="font-mono text-white font-bold">
                  {selectedDriver.truckStock?.bottles18_9L ?? 0}x 18.9L | {selectedDriver.truckStock?.bottles13L ?? 0}x 13L
                </span>
              </div>
              {selectedDriverDistance !== null && (
                <div className="flex justify-between">
                  <span className="text-[#8899AA]">From Central Plant:</span>
                  <span className="font-mono text-[#F59E0B] font-semibold">{selectedDriverDistance.toFixed(1)} km</span>
                </div>
              )}
            </div>

            <div className="mt-3 pt-2 border-t border-[#243447] flex items-center gap-2">
              <a
                href={`tel:${selectedDriver.phone || '+255754882101'}`}
                className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 bg-[#1A2E1C] hover:bg-[#253D28] text-white rounded-xl border border-[#3A5068] transition-all text-xs font-semibold"
              >
                <Phone className="w-3.5 h-3.5 text-[#00C46A]" />
                <span>Call Driver</span>
              </a>
              {onNavigate && (
                <button
                  type="button"
                  onClick={() => onNavigate('messages')}
                  className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 bg-[#006B3C] hover:bg-[#008F50] text-white rounded-xl transition-all text-xs font-semibold"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Message</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Selected Hub Inspection Card */}
        {selectedHub && !selectedDriver && (
          <div className="absolute bottom-3 right-3 sm:right-4 z-[500] w-[calc(100%-24px)] sm:w-80 bg-[#0A1A0F]/95 backdrop-blur-md p-4 rounded-2xl border border-[#00C46A]/60 shadow-2xl animate-fade-in text-xs">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-[#006B3C] text-white flex items-center justify-center font-bold">
                  <Building2 className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-white text-sm">{selectedHub.name}</h4>
                  <div className="text-[11px] text-[#00C46A]">{selectedHub.role}</div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedHub(null)}
                className="p-1 rounded-lg text-[#8899AA] hover:text-white hover:bg-[#1A2E1C]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-3 space-y-1.5 pt-2 border-t border-[#243447] text-[11px]">
              <div className="text-[#8899AA]">{selectedHub.address}</div>
              <div className="flex justify-between pt-1">
                <span className="text-[#8899AA]">Stock Buffer:</span>
                <span className="font-mono text-white font-bold">{selectedHub.capacity}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 3. Operations Zone Key Footer Strip */}
      <div className="p-3.5 bg-[#0E1A0E] border-t border-[#2A5038] flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3 sm:gap-5 flex-wrap text-[11px] text-[#8899AA]">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#00C46A]"></span>
            <span className="text-white">Central RO Plant (Nyakato)</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#3B82F6]"></span>
            <span>At Customer Drop</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#006B3C] border border-[#00C46A]"></span>
            <span>8 Regional Substations</span>
          </span>
        </div>

        {/* Quick GPS Transmitter Button */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleLocateMe}
            disabled={isLocating}
            className="flex items-center gap-1 text-[11px] font-bold text-[#00C46A] hover:text-white bg-[#1A2E1C] px-2.5 py-1.5 rounded-lg border border-[#3A5068]/50 hover:border-[#00C46A] transition-all"
          >
            <Radio className={`w-3.5 h-3.5 ${isGpsBroadcasting ? 'animate-pulse text-[#00C46A]' : ''}`} />
            <span>{isGpsBroadcasting ? 'GPS Live: On' : 'Broadcast My GPS'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProtomapsLiveMap;
