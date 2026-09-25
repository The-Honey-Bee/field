import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  Map,
  AdvancedMarker,
  InfoWindow,
  useMap,
} from '@vis.gl/react-google-maps';
import { GoogleMapsProvider, useGoogleMaps } from './GoogleMapsProvider';
import { DeliverySite, DeliverySiteStatus, DeliverySiteCategory } from '../types';
import { MWANZA_DELIVERY_SITES } from '../data/mwanzaDeliverySites';
import { MWANZA_HUBS, calculateDistanceKm } from '../services/geolocation';
import {
  MapPin,
  Building2,
  Navigation,
  Clock,
  Phone,
  AlertTriangle,
  CheckCircle2,
  Package,
  Layers,
  Search,
  Filter,
  Truck,
  ExternalLink,
  RotateCcw,
  Sparkles,
  Compass,
  X,
  Crosshair,
  Hotel,
  Briefcase,
  GraduationCap,
  Store,
  HeartPulse,
} from 'lucide-react';

export interface GoogleMapComponentProps {
  apiKey?: string;
  center?: google.maps.LatLngLiteral;
  zoom?: number;
  height?: string | number;
  className?: string;
  mapTypeId?: 'roadmap' | 'satellite' | 'terrain' | 'hybrid';
  deliverySites?: DeliverySite[];
  selectedSiteId?: string | null;
  onSiteSelect?: (site: DeliverySite | null) => void;
  onSiteStatusChange?: (siteId: string, newStatus: DeliverySiteStatus) => void;
  showHubs?: boolean;
  showZoneBoundary?: boolean;
  showRoutes?: boolean;
  showFilterBar?: boolean;
  showQuickStats?: boolean;
  interactive?: boolean;
  children?: React.ReactNode;
}

// Mwanza, Tanzania Geographic Coordinates
export const MWANZA_COORDINATES: google.maps.LatLngLiteral = {
  lat: -2.5164,
  lng: 32.9000,
};

// Lake Victoria Logistics Zone Geofence
export const MWANZA_OPERATIONS_ZONE_PATH: google.maps.LatLngLiteral[] = [
  { lat: -2.4720, lng: 32.9080 }, // North: Pasiansi & Airport Approach
  { lat: -2.4850, lng: 32.9380 }, // North-East: Nyamanoro & Bwiru Ridge
  { lat: -2.5200, lng: 32.9850 }, // East: Igoma Industrial Hub & Musoma Hwy
  { lat: -2.5520, lng: 32.9800 }, // South-East: Mahina & Kishiri Border
  { lat: -2.5780, lng: 32.9150 }, // South: Nyegezi Transit Terminal & Butimba
  { lat: -2.5680, lng: 32.8820 }, // South-West: Lake Victoria Shoreline & Sweya
  { lat: -2.5220, lng: 32.8760 }, // West: Capripoint & Tilapia Bay Waterfront
  { lat: -2.4880, lng: 32.8880 }, // North-West: Kirumba Bay & Stadium Sector
];

/**
 * Inner Component for Geofence Polygon
 */
const MwanzaGeofencePolygon: React.FC<{
  paths: google.maps.LatLngLiteral[];
  visible: boolean;
}> = ({ paths, visible }) => {
  const map = useMap();
  const polygonRef = useRef<google.maps.Polygon | null>(null);

  useEffect(() => {
    if (!map) return;
    const polygon = new google.maps.Polygon({
      paths,
      strokeColor: '#00C46A',
      strokeOpacity: 0.85,
      strokeWeight: 2,
      fillColor: '#006B3C',
      fillOpacity: 0.12,
      map: visible ? map : null,
      clickable: false,
    });
    polygonRef.current = polygon;

    return () => {
      polygon.setMap(null);
    };
  }, [map, paths]);

  useEffect(() => {
    if (polygonRef.current) {
      polygonRef.current.setMap(visible ? map : null);
    }
  }, [visible, map]);

  return null;
};

/**
 * Inner Component for Dynamic Dispatch Route Polylines
 */
const DeliveryRoutesLayer: React.FC<{
  routes: Array<{
    id: string;
    from: google.maps.LatLngLiteral;
    to: google.maps.LatLngLiteral;
    color: string;
  }>;
  visible: boolean;
}> = ({ routes, visible }) => {
  const map = useMap();
  const polylinesRef = useRef<google.maps.Polyline[]>([]);

  useEffect(() => {
    if (!map) return;

    polylinesRef.current.forEach((p) => p.setMap(null));
    polylinesRef.current = [];

    if (!visible) return;

    const created = routes.map((r) => {
      return new google.maps.Polyline({
        path: [r.from, r.to],
        strokeColor: r.color,
        strokeOpacity: 0.65,
        strokeWeight: 2.5,
        geodesic: true,
        map,
      });
    });

    polylinesRef.current = created;

    return () => {
      created.forEach((p) => p.setMap(null));
    };
  }, [map, routes, visible]);

  return null;
};

/**
 * Programmatic Camera Pan & Zoom Controller
 */
const CameraController: React.FC<{
  command: { center: google.maps.LatLngLiteral; zoom: number; timestamp: number } | null;
}> = ({ command }) => {
  const map = useMap();
  useEffect(() => {
    if (!map || !command) return;
    map.panTo(command.center);
    map.setZoom(command.zoom);
  }, [map, command]);
  return null;
};

/**
 * Helper to get icon for category
 */
const getCategoryIcon = (category: DeliverySiteCategory) => {
  switch (category) {
    case 'hotel_hospitality':
      return <Hotel className="w-3.5 h-3.5" />;
    case 'commercial_office':
      return <Briefcase className="w-3.5 h-3.5" />;
    case 'health_hospital':
      return <HeartPulse className="w-3.5 h-3.5" />;
    case 'retail_plaza':
      return <Store className="w-3.5 h-3.5" />;
    case 'institution_school':
      return <GraduationCap className="w-3.5 h-3.5" />;
    case 'residential':
      return <Building2 className="w-3.5 h-3.5" />;
    default:
      return <MapPin className="w-3.5 h-3.5" />;
  }
};

/**
 * Helper for visual color mapping based on status
 */
const getStatusTheme = (status: DeliverySiteStatus) => {
  switch (status) {
    case 'urgent':
      return {
        bg: 'bg-rose-600',
        border: 'border-rose-400',
        ring: 'bg-rose-500/30',
        text: 'text-rose-400',
        label: 'Urgent Priority',
        badge: 'bg-rose-950/80 text-rose-300 border-rose-500/50',
        polylineColor: '#F43F5E',
      };
    case 'in_progress':
      return {
        bg: 'bg-blue-600',
        border: 'border-blue-400',
        ring: 'bg-blue-500/30',
        text: 'text-blue-400',
        label: 'In Progress',
        badge: 'bg-blue-950/80 text-blue-300 border-blue-500/50',
        polylineColor: '#3B82F6',
      };
    case 'delivered':
      return {
        bg: 'bg-[#00C46A]',
        border: 'border-[#4EFEA3]',
        ring: 'bg-[#00C46A]/20',
        text: 'text-[#00C46A]',
        label: 'Delivered',
        badge: 'bg-emerald-950/80 text-emerald-300 border-emerald-500/50',
        polylineColor: '#00C46A',
      };
    case 'scheduled':
      return {
        bg: 'bg-purple-600',
        border: 'border-purple-400',
        ring: 'bg-purple-500/30',
        text: 'text-purple-400',
        label: 'Scheduled',
        badge: 'bg-purple-950/80 text-purple-300 border-purple-500/50',
        polylineColor: '#A855F7',
      };
    case 'pending':
    default:
      return {
        bg: 'bg-amber-600',
        border: 'border-amber-400',
        ring: 'bg-amber-500/30',
        text: 'text-amber-400',
        label: 'Pending Drop',
        badge: 'bg-amber-950/80 text-amber-300 border-amber-500/50',
        polylineColor: '#F59E0B',
      };
  }
};

/**
 * Inner Map Implementation Component
 */
const GoogleMapInner: React.FC<GoogleMapComponentProps> = ({
  center = MWANZA_COORDINATES,
  zoom = 13,
  height = '520px',
  className = '',
  mapTypeId: initialMapType = 'roadmap',
  deliverySites: propSites,
  selectedSiteId: propSelectedSiteId,
  onSiteSelect,
  onSiteStatusChange,
  showHubs = true,
  showZoneBoundary = true,
  showRoutes = true,
  showFilterBar = true,
  showQuickStats = true,
  interactive = true,
  children,
}) => {
  // Local state
  const [internalSites, setInternalSites] = useState<DeliverySite[]>(
    propSites || MWANZA_DELIVERY_SITES
  );
  const [activeSiteId, setActiveSiteId] = useState<string | null>(
    propSelectedSiteId || null
  );
  const [selectedHub, setSelectedHub] = useState<any | null>(null);
  const [currentMapType, setCurrentMapType] = useState<
    'roadmap' | 'satellite' | 'terrain'
  >(initialMapType === 'hybrid' ? 'satellite' : (initialMapType as any));
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<DeliverySiteStatus | 'all'>('all');
  const [isZoneVisible, setIsZoneVisible] = useState(showZoneBoundary);
  const [isRoutesVisible, setIsRoutesVisible] = useState(showRoutes);
  const [cameraCommand, setCameraCommand] = useState<{
    center: google.maps.LatLngLiteral;
    zoom: number;
    timestamp: number;
  } | null>(null);

  // Sync if propSites update
  useEffect(() => {
    if (propSites) {
      setInternalSites(propSites);
    }
  }, [propSites]);

  // Sync if propSelectedSiteId changes
  useEffect(() => {
    if (propSelectedSiteId !== undefined) {
      setActiveSiteId(propSelectedSiteId);
    }
  }, [propSelectedSiteId]);

  const selectedSite = useMemo(() => {
    return internalSites.find((s) => s.id === activeSiteId) || null;
  }, [internalSites, activeSiteId]);

  // Filtered sites based on search and status
  const filteredSites = useMemo(() => {
    return internalSites.filter((site) => {
      const matchesStatus = statusFilter === 'all' || site.status === statusFilter;
      const q = searchQuery.toLowerCase().trim();
      const matchesQuery =
        !q ||
        site.name.toLowerCase().includes(q) ||
        site.sector.toLowerCase().includes(q) ||
        site.address.toLowerCase().includes(q) ||
        (site.assignedDriver?.driverName.toLowerCase().includes(q) ?? false);
      return matchesStatus && matchesQuery;
    });
  }, [internalSites, statusFilter, searchQuery]);

  // Quick stats calculations
  const stats = useMemo(() => {
    const total = internalSites.length;
    const urgent = internalSites.filter((s) => s.status === 'urgent').length;
    const inProgress = internalSites.filter((s) => s.status === 'in_progress').length;
    const delivered = internalSites.filter((s) => s.status === 'delivered').length;
    const pending = internalSites.filter((s) => s.status === 'pending').length;
    const totalBottles18 = internalSites.reduce(
      (sum, s) => sum + s.orderItems.bottles18_9L,
      0
    );
    return { total, urgent, inProgress, delivered, pending, totalBottles18 };
  }, [internalSites]);

  // Central RO Bottling Plant in Nyakato
  const nyakatoPlant = MWANZA_HUBS.DEPOT_NYAKATO;

  // Compute routes from Nyakato Plant to active/in-progress sites
  const dispatchRoutes = useMemo(() => {
    return internalSites
      .filter((s) => s.status === 'in_progress' || s.status === 'urgent')
      .map((site) => {
        const theme = getStatusTheme(site.status);
        return {
          id: site.id,
          from: { lat: nyakatoPlant.lat, lng: nyakatoPlant.lng },
          to: { lat: site.latitude, lng: site.longitude },
          color: theme.polylineColor,
        };
      });
  }, [internalSites, nyakatoPlant]);

  // Site selection handler
  const handleSelectSite = (site: DeliverySite | null) => {
    setActiveSiteId(site ? site.id : null);
    setSelectedHub(null);
    onSiteSelect?.(site);
    if (site) {
      setCameraCommand({
        center: { lat: site.latitude, lng: site.longitude },
        zoom: 15,
        timestamp: Date.now(),
      });
    }
  };

  // Status toggle handler
  const handleStatusChange = (siteId: string, newStatus: DeliverySiteStatus) => {
    setInternalSites((prev) =>
      prev.map((s) => {
        if (s.id === siteId) {
          return {
            ...s,
            status: newStatus,
            deliveredAt:
              newStatus === 'delivered'
                ? new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                : s.deliveredAt,
          };
        }
        return s;
      })
    );
    onSiteStatusChange?.(siteId, newStatus);
  };

  // Recenter to Mwanza City
  const handleRecenter = () => {
    setActiveSiteId(null);
    setSelectedHub(null);
    setCameraCommand({
      center: MWANZA_COORDINATES,
      zoom: 13,
      timestamp: Date.now(),
    });
  };

  // Focus Nyakato Depot
  const handleFocusNyakato = () => {
    setSelectedHub(nyakatoPlant);
    setActiveSiteId(null);
    setCameraCommand({
      center: { lat: nyakatoPlant.lat, lng: nyakatoPlant.lng },
      zoom: 15,
      timestamp: Date.now(),
    });
  };

  // Distance of selected site from Nyakato Central RO Plant
  const siteDistanceFromPlant = selectedSite
    ? calculateDistanceKm(
        nyakatoPlant.lat,
        nyakatoPlant.lng,
        selectedSite.latitude,
        selectedSite.longitude
      )
    : null;

  return (
    <div
      className={`bg-[#122010] rounded-2xl border border-[#2A5038] shadow-xl overflow-hidden flex flex-col relative ${className}`}
    >
      {/* 1. Header Toolbar with Filter Bar & Map Controls */}
      {showFilterBar && (
        <div className="p-4 border-b border-[#2A5038] bg-[#0E1A0E] flex flex-col gap-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-[#006B3C]/30 text-[#00C46A] border border-[#00C46A]/30">
                  <Package className="w-4 h-4" />
                </div>
                <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                  <span>Mwanza Active Delivery Sites</span>
                  <span className="text-[10px] font-mono font-bold bg-[#1A73E8]/20 text-[#60A5FA] px-2 py-0.5 rounded-full border border-[#1A73E8]/40 uppercase tracking-wider flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#3B82F6] animate-pulse"></span>
                    Google Maps
                  </span>
                </h3>
              </div>
              <p className="text-xs text-[#8899AA] mt-1">
                Real-time tracking of active customer drop sites, priority hospitals, hotels & commercial towers
              </p>
            </div>

            {/* Quick Action Controls */}
            <div className="flex items-center gap-2 flex-wrap self-end sm:self-auto">
              {/* Map Type Toggle */}
              <div className="flex items-center bg-[#1A2E1C] p-1 rounded-xl border border-[#3A5068]/60">
                {(
                  [
                    { key: 'roadmap', label: 'Roadmap' },
                    { key: 'satellite', label: 'Satellite' },
                    { key: 'terrain', label: 'Terrain' },
                  ] as const
                ).map((t) => (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => setCurrentMapType(t.key)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all ${
                      currentMapType === t.key
                        ? 'bg-[#006B3C] text-white shadow-xs font-semibold'
                        : 'text-[#8899AA] hover:text-white'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {/* Recenter Mwanza */}
              <button
                type="button"
                onClick={handleRecenter}
                title="Recenter Mwanza operations map"
                className="p-2 rounded-xl bg-[#1A2E1C] hover:bg-[#253D28] text-white border border-[#3A5068]/60 hover:border-[#00C46A] transition-all"
              >
                <Crosshair className="w-4 h-4 text-[#00C46A]" />
              </button>

              {/* Focus Nyakato Depot */}
              <button
                type="button"
                onClick={handleFocusNyakato}
                title="Focus Central RO Bottling Plant in Nyakato"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#1A2E1C] hover:bg-[#253D28] text-xs font-semibold text-white border border-[#3A5068]/60 hover:border-[#00C46A] transition-all"
              >
                <Building2 className="w-3.5 h-3.5 text-[#00C46A]" />
                <span className="hidden md:inline">Nyakato Plant</span>
              </button>
            </div>
          </div>

          {/* Search Input & Status Filter Pills */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 pt-2 border-t border-[#2A5038]/60">
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-[#8899AA] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search delivery site, sector (e.g. Capripoint, Posta), or driver..."
                className="w-full pl-9 pr-8 py-1.5 bg-[#1A2E1C] text-white placeholder-[#687C8E] rounded-xl border border-[#3A5068]/60 focus:outline-none focus:border-[#00C46A] text-xs transition-all"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#8899AA] hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
              {(
                [
                  { key: 'all', label: `All (${stats.total})` },
                  { key: 'urgent', label: `Urgent (${stats.urgent})`, color: 'text-rose-400' },
                  { key: 'in_progress', label: `Active (${stats.inProgress})`, color: 'text-blue-400' },
                  { key: 'pending', label: `Pending (${stats.pending})`, color: 'text-amber-400' },
                  { key: 'delivered', label: `Delivered (${stats.delivered})`, color: 'text-emerald-400' },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setStatusFilter(tab.key)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold whitespace-nowrap transition-all border ${
                    statusFilter === tab.key
                      ? 'bg-[#006B3C] text-white border-[#00C46A] shadow-sm'
                      : 'bg-[#1A2E1C]/80 text-[#8899AA] hover:text-white border-[#3A5068]/40'
                  }`}
                >
                  <span className={statusFilter === tab.key ? 'text-white' : (tab as any).color || ''}>
                    {tab.label}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 2. Google Map Canvas Container */}
      <div
        className="relative w-full overflow-hidden bg-[#0A1A0F]"
        style={{ height: typeof height === 'number' ? `${height}px` : height }}
      >
        <Map
          mapId="DEMO_MAP_ID"
          defaultCenter={center}
          defaultZoom={zoom}
          mapTypeId={currentMapType}
          gestureHandling="greedy"
          disableDefaultUI={false}
          zoomControl={true}
          mapTypeControl={false}
          streetViewControl={false}
          fullscreenControl={false}
          internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
          style={{ width: '100%', height: '100%' }}
        >
          {/* Mwanza Operations Zone Geofence */}
          <MwanzaGeofencePolygon
            paths={MWANZA_OPERATIONS_ZONE_PATH}
            visible={isZoneVisible}
          />

          {/* Dynamic Dispatch Route Polylines */}
          <DeliveryRoutesLayer routes={dispatchRoutes} visible={isRoutesVisible} />

          {/* Camera Controller */}
          <CameraController command={cameraCommand} />

          {/* Central RO Bottling Plant in Nyakato */}
          {showHubs && (
            <AdvancedMarker
              position={{ lat: nyakatoPlant.lat, lng: nyakatoPlant.lng }}
              title={nyakatoPlant.name}
              zIndex={1200}
              onClick={() => {
                setSelectedHub(nyakatoPlant);
                setActiveSiteId(null);
                onSiteSelect?.(null);
              }}
            >
              <div className="relative flex items-center justify-center cursor-pointer group select-none">
                <div className="absolute -inset-2.5 rounded-full bg-[#00C46A]/30 animate-ping"></div>
                <div className="w-10 h-10 rounded-2xl bg-[#006B3C] border-2 border-[#00C46A] shadow-2xl flex flex-col items-center justify-center text-white transition-transform group-hover:scale-110">
                  <Building2 className="w-5 h-5 text-white" />
                </div>
                <div className="absolute -bottom-5 bg-[#0A1A0F]/95 text-[#00C46A] text-[9px] font-bold px-2 py-0.5 rounded-full border border-[#00C46A]/50 whitespace-nowrap shadow-lg flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#00C46A]"></span>
                  <span>CENTRAL BOTTLING PLANT</span>
                </div>
              </div>
            </AdvancedMarker>
          )}

          {/* MARKER SYSTEM: Active Delivery Sites in Mwanza */}
          {filteredSites.map((site) => {
            const isSelected = site.id === activeSiteId;
            const theme = getStatusTheme(site.status);

            return (
              <AdvancedMarker
                key={site.id}
                position={{ lat: site.latitude, lng: site.longitude }}
                title={`${site.name} (${site.sector})`}
                zIndex={isSelected ? 1000 : site.status === 'urgent' ? 800 : 500}
                onClick={() => handleSelectSite(site)}
              >
                <div className="relative cursor-pointer group select-none">
                  {/* Pulse Ring for Urgent and In-Progress deliveries */}
                  {(site.status === 'urgent' || site.status === 'in_progress') && (
                    <div
                      className={`absolute -inset-2 rounded-full ${theme.ring} animate-ping`}
                    />
                  )}

                  {/* Marker Pin Icon */}
                  <div
                    className={`w-9 h-9 rounded-2xl ${theme.bg} ${theme.border} border-2 shadow-2xl flex items-center justify-center text-white transition-transform group-hover:scale-110 ${
                      isSelected ? 'ring-4 ring-white shadow-emerald-500/50 scale-110' : ''
                    }`}
                  >
                    {site.status === 'delivered' ? (
                      <CheckCircle2 className="w-4 h-4 text-white" />
                    ) : site.status === 'urgent' ? (
                      <AlertTriangle className="w-4 h-4 text-white" />
                    ) : (
                      getCategoryIcon(site.category)
                    )}
                  </div>

                  {/* Micro Marker Label */}
                  <div className="absolute -bottom-4.5 left-1/2 -translate-x-1/2 bg-[#0A1A0F]/95 text-white text-[8.5px] font-semibold px-1.5 py-0.5 rounded-full border border-[#243447] whitespace-nowrap shadow-lg flex items-center gap-1">
                    <span className={`w-1.5 h-1.5 rounded-full ${theme.bg}`}></span>
                    <span>{site.name.split(' ')[0]}</span>
                    <span className="text-[#00C46A] font-mono">
                      {site.orderItems.bottles18_9L}x
                    </span>
                  </div>
                </div>
              </AdvancedMarker>
            );
          })}

          {/* Custom User-Supplied Child Overlays */}
          {children}
        </Map>

        {/* Floating Quick Action Overlay (Top Left inside Map) */}
        <div className="absolute top-3 left-3 z-10 flex flex-col gap-2">
          {/* Operations Geofence Toggle */}
          <button
            type="button"
            onClick={() => setIsZoneVisible(!isZoneVisible)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold shadow-lg backdrop-blur-md transition-all border ${
              isZoneVisible
                ? 'bg-[#0A1A0F]/90 text-white border-[#00C46A]/50'
                : 'bg-[#0A1A0F]/70 text-[#8899AA] border-[#243447]'
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-[#00C46A]" />
            <span>Mwanza Zone</span>
          </button>

          {/* Route Polylines Toggle */}
          <button
            type="button"
            onClick={() => setIsRoutesVisible(!isRoutesVisible)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold shadow-lg backdrop-blur-md transition-all border ${
              isRoutesVisible
                ? 'bg-[#0A1A0F]/90 text-[#3B82F6] border-[#3B82F6]/50'
                : 'bg-[#0A1A0F]/70 text-[#8899AA] border-[#243447]'
            }`}
          >
            <Navigation className="w-3.5 h-3.5" />
            <span>Active Corridors</span>
          </button>
        </div>

        {/* Floating Marker System Quick Stats Badge (Bottom Left) */}
        {showQuickStats && (
          <div className="absolute bottom-3 left-3 z-10 bg-[#0A1A0F]/90 backdrop-blur-md p-3 rounded-2xl border border-[#2A5038] shadow-xl max-w-xs text-[11px] hidden sm:block">
            <div className="flex items-center justify-between gap-4 font-semibold text-white mb-1.5">
              <span className="flex items-center gap-1.5 text-[#00C46A]">
                <Package className="w-3.5 h-3.5" />
                <span>Delivery Marker System</span>
              </span>
              <span className="text-[10px] text-[#60A5FA] font-mono">
                {filteredSites.length} of {stats.total} Sites
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2 pt-1 border-t border-[#243447] text-[10px]">
              <div>
                <span className="text-[#8899AA]">Urgent:</span>
                <span className="font-bold text-rose-400 ml-1">{stats.urgent}</span>
              </div>
              <div>
                <span className="text-[#8899AA]">In Transit:</span>
                <span className="font-bold text-blue-400 ml-1">{stats.inProgress}</span>
              </div>
              <div>
                <span className="text-[#8899AA]">Completed:</span>
                <span className="font-bold text-emerald-400 ml-1">{stats.delivered}</span>
              </div>
            </div>
          </div>
        )}

        {/* Selected Delivery Site Enriched Inspection Card (Bottom Right) */}
        {selectedSite && (
          <div className="absolute bottom-3 right-3 sm:right-4 z-20 w-[calc(100%-24px)] sm:w-90 bg-[#0A1A0F]/95 backdrop-blur-md p-4 rounded-2xl border border-[#00C46A]/60 shadow-2xl animate-fade-in text-xs">
            {/* Header: Title & Close */}
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div
                  className={`w-9 h-9 rounded-xl ${
                    getStatusTheme(selectedSite.status).bg
                  } text-white flex items-center justify-center shadow-md`}
                >
                  {getCategoryIcon(selectedSite.category)}
                </div>
                <div>
                  <h4 className="font-bold text-white text-sm leading-tight">
                    {selectedSite.name}
                  </h4>
                  <div className="text-[11px] text-[#8899AA] flex items-center gap-1 mt-0.5">
                    <MapPin className="w-3 h-3 text-[#00C46A]" />
                    <span>{selectedSite.sector} &bull; {selectedSite.address}</span>
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleSelectSite(null)}
                className="p-1 rounded-lg text-[#8899AA] hover:text-white hover:bg-[#1A2E1C]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Status & Timing Row */}
            <div className="mt-3 flex items-center justify-between gap-2 pt-2 border-t border-[#243447]">
              <span
                className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                  getStatusTheme(selectedSite.status).badge
                }`}
              >
                {getStatusTheme(selectedSite.status).label}
              </span>
              <span className="text-[10px] text-[#8899AA] flex items-center gap-1">
                <Clock className="w-3 h-3 text-[#00C46A]" />
                <span>Window: {selectedSite.deliveryWindow}</span>
              </span>
            </div>

            {/* Order Items & Stock Payload */}
            <div className="mt-2.5 bg-[#122010] p-2.5 rounded-xl border border-[#2A5038] space-y-1 text-[11px]">
              <div className="flex justify-between items-center">
                <span className="text-[#8899AA]">Bottle Order:</span>
                <span className="font-mono text-white font-bold">
                  {selectedSite.orderItems.bottles18_9L}x 18.9L |{' '}
                  {selectedSite.orderItems.bottles13L}x 13L
                  {selectedSite.orderItems.dispensers
                    ? ` | ${selectedSite.orderItems.dispensers}x Dispenser`
                    : ''}
                </span>
              </div>
              {siteDistanceFromPlant !== null && (
                <div className="flex justify-between items-center">
                  <span className="text-[#8899AA]">Distance from RO Plant:</span>
                  <span className="font-mono text-[#F59E0B] font-semibold">
                    {siteDistanceFromPlant.toFixed(1)} km
                  </span>
                </div>
              )}
              {selectedSite.assignedDriver && (
                <div className="flex justify-between items-center pt-1 border-t border-[#2A5038]/60">
                  <span className="text-[#8899AA]">Assigned Driver:</span>
                  <span className="text-white font-medium flex items-center gap-1">
                    <Truck className="w-3 h-3 text-[#00C46A]" />
                    <span>{selectedSite.assignedDriver.driverName}</span>
                    <span className="text-[#8899AA] font-mono text-[10px]">
                      ({selectedSite.assignedDriver.vehiclePlate})
                    </span>
                  </span>
                </div>
              )}
            </div>

            {/* Site Gate Notes if any */}
            {selectedSite.notes && (
              <p className="mt-2 text-[10.5px] text-[#8899AA] italic bg-[#1A2E1C]/50 p-2 rounded-lg border border-[#3A5068]/30">
                &ldquo;{selectedSite.notes}&rdquo;
              </p>
            )}

            {/* Interactive Quick Status Toggle Buttons */}
            <div className="mt-3 pt-2 border-t border-[#243447] flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] text-[#8899AA] w-full mb-0.5">
                Update Delivery Status:
              </span>
              <button
                type="button"
                onClick={() => handleStatusChange(selectedSite.id, 'in_progress')}
                className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition-all ${
                  selectedSite.status === 'in_progress'
                    ? 'bg-blue-600 text-white border-blue-400'
                    : 'bg-[#1A2E1C] text-blue-300 border-blue-500/30 hover:border-blue-400'
                }`}
              >
                In Progress
              </button>
              <button
                type="button"
                onClick={() => handleStatusChange(selectedSite.id, 'delivered')}
                className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition-all ${
                  selectedSite.status === 'delivered'
                    ? 'bg-[#00C46A] text-[#0A1A0F] border-[#4EFEA3]'
                    : 'bg-[#1A2E1C] text-emerald-300 border-emerald-500/30 hover:border-[#00C46A]'
                }`}
              >
                Delivered
              </button>
              <button
                type="button"
                onClick={() => handleStatusChange(selectedSite.id, 'pending')}
                className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition-all ${
                  selectedSite.status === 'pending'
                    ? 'bg-amber-600 text-white border-amber-400'
                    : 'bg-[#1A2E1C] text-amber-300 border-amber-500/30 hover:border-amber-400'
                }`}
              >
                Pending
              </button>
            </div>

            {/* Action Bar: Call Contact & Open Google Maps Turn-by-Turn Navigation */}
            <div className="mt-3 pt-2 border-t border-[#243447] flex items-center gap-2">
              <a
                href={`tel:${selectedSite.contactPhone}`}
                className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 bg-[#1A2E1C] hover:bg-[#253D28] text-white rounded-xl border border-[#3A5068] transition-all text-xs font-semibold"
              >
                <Phone className="w-3.5 h-3.5 text-[#00C46A]" />
                <span>Call Site</span>
              </a>
              <a
                href={`https://www.google.com/maps/dir/?api=1&destination=${selectedSite.latitude},${selectedSite.longitude}`}
                target="_blank"
                rel="noreferrer"
                className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 bg-[#006B3C] hover:bg-[#008F50] text-white rounded-xl transition-all text-xs font-semibold"
              >
                <Navigation className="w-3.5 h-3.5" />
                <span>Directions</span>
                <ExternalLink className="w-3 h-3 text-[#A0DAB5]" />
              </a>
            </div>
          </div>
        )}

        {/* Selected Hub Inspection Card */}
        {selectedHub && !selectedSite && (
          <div className="absolute bottom-3 right-3 sm:right-4 z-20 w-[calc(100%-24px)] sm:w-80 bg-[#0A1A0F]/95 backdrop-blur-md p-4 rounded-2xl border border-[#00C46A]/60 shadow-2xl animate-fade-in text-xs">
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
                <span className="text-[#8899AA]">Plant Buffer:</span>
                <span className="font-mono text-white font-bold">{selectedHub.capacity}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 3. Footer Operations Corridor Legend */}
      <div className="p-3.5 bg-[#0E1A0E] border-t border-[#2A5038] flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3 sm:gap-4 flex-wrap text-[11px] text-[#8899AA]">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse"></span>
            <span className="text-white">Urgent Drops</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
            <span>In Progress / Delivering</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
            <span>Pending Window</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#00C46A]"></span>
            <span>Delivered & Verified</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#006B3C] border border-[#00C46A]"></span>
            <span>Nyakato Central Plant</span>
          </span>
        </div>
      </div>
    </div>
  );
};

/**
 * Reusable GoogleMapComponent
 *
 * Self-wrapping: If used within an existing GoogleMapsProvider context, it will render directly.
 * If used outside of any GoogleMapsProvider, it wraps itself with GoogleMapsProvider automatically!
 */
export const GoogleMapComponent: React.FC<GoogleMapComponentProps> = (props) => {
  const mapsContext = useGoogleMaps();

  // If already wrapped by GoogleMapsProvider, render inner map directly
  if (mapsContext && mapsContext.apiKey) {
    return <GoogleMapInner {...props} />;
  }

  // Otherwise, wrap with GoogleMapsProvider
  return (
    <GoogleMapsProvider apiKey={props.apiKey}>
      <GoogleMapInner {...props} />
    </GoogleMapsProvider>
  );
};

export default GoogleMapComponent;
