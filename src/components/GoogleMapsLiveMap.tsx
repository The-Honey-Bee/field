import React, { useEffect, useRef, useState } from 'react';
import {
  Map,
  AdvancedMarker,
  InfoWindow,
  useMap,
  useAdvancedMarkerRef,
} from '@vis.gl/react-google-maps';
import { GoogleMapsProvider } from './GoogleMapsProvider';
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
  Building2,
  Maximize2,
  Phone,
  MessageSquare,
  Crosshair,
  X,
  Map as MapIcon,
  CheckCircle2,
} from 'lucide-react';

interface GoogleMapsLiveMapProps {
  onNavigate?: (view: string) => void;
  className?: string;
  height?: string | number;
}

// Google Maps Platform API Key (Demo Key provisioned for AI Studio or environment variable)
export const GOOGLE_MAPS_API_KEY =
  (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_GOOGLE_MAPS_API_KEY) ||
  'AIzaSyDn5f3kuL4ByNDovy7jvcXwkJ5B7Us4_zA';

// Mwanza Coordinates & Operations Coordinates
export const MWANZA_CENTER = { lat: -2.5164, lng: 32.9000 };
export const MWANZA_DEFAULT_ZOOM = 13;

// Active Mwanza Operations Zone Boundary Polygon (Lake Victoria Logistics Corridor)
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

// Inner Subcomponent: Geofence Polygon Overlay
const MwanzaZonePolygon: React.FC<{
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
      strokeOpacity: 0.9,
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

// Inner Subcomponent: Dynamic Route Polylines from Depot to Trucks
const MwanzaRouteLines: React.FC<{
  routes: Array<{
    from: google.maps.LatLngLiteral;
    to: google.maps.LatLngLiteral;
    color: string;
    id: string;
  }>;
  visible: boolean;
}> = ({ routes, visible }) => {
  const map = useMap();
  const linesRef = useRef<google.maps.Polyline[]>([]);

  useEffect(() => {
    if (!map) return;

    // Clear previous lines
    linesRef.current.forEach((line) => line.setMap(null));
    linesRef.current = [];

    if (!visible) return;

    const created = routes.map((r) => {
      const line = new google.maps.Polyline({
        path: [r.from, r.to],
        strokeColor: r.color,
        strokeOpacity: 0.65,
        strokeWeight: 3,
        geodesic: true,
        map,
      });
      return line;
    });

    linesRef.current = created;

    return () => {
      created.forEach((l) => l.setMap(null));
    };
  }, [map, routes, visible]);

  return null;
};

// Inner Subcomponent: Programmatic Camera Pan/Zoom Controller
const MapCameraController: React.FC<{
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

export const GoogleMapsLiveMap: React.FC<GoogleMapsLiveMapProps> = ({
  onNavigate,
  className = '',
  height = 430,
}) => {
  const { isSwahili } = useLanguage();
  const { user } = useAuth();
  const { isSunlight } = useTheme();

  // State management
  const [fleet, setFleet] = useState<FieldTeamLocation[]>([]);
  const [selectedDriver, setSelectedDriver] = useState<FieldTeamLocation | null>(null);
  const [selectedHub, setSelectedHub] = useState<any | null>(null);
  const [mapType, setMapType] = useState<'roadmap' | 'satellite' | 'hybrid' | 'terrain'>(
    isSunlight ? 'roadmap' : 'roadmap'
  );
  const [showHubs, setShowHubs] = useState<boolean>(true);
  const [showZoneBoundary, setShowZoneBoundary] = useState<boolean>(true);
  const [showRoutes, setShowRoutes] = useState<boolean>(true);
  const [isGpsBroadcasting, setIsGpsBroadcasting] = useState<boolean>(false);
  const [myGpsCoords, setMyGpsCoords] = useState<any>(null);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [cameraCommand, setCameraCommand] = useState<{
    center: google.maps.LatLngLiteral;
    zoom: number;
    timestamp: number;
  } | null>(null);

  // Subscribe to live fleet and telemetry
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

  // Quick camera actions
  const handleFitMwanzaArea = () => {
    setCameraCommand({
      center: MWANZA_CENTER,
      zoom: MWANZA_DEFAULT_ZOOM,
      timestamp: Date.now(),
    });
  };

  const handleFocusCentralDepot = () => {
    const nyakato = MWANZA_HUBS.DEPOT_NYAKATO;
    setCameraCommand({
      center: { lat: nyakato.lat, lng: nyakato.lng },
      zoom: 15,
      timestamp: Date.now(),
    });
  };

  const handleLocateMe = async () => {
    setIsLocating(true);
    try {
      if (!isGpsBroadcasting && user) {
        await geolocationService.startTracking(user, (loc) => {
          setMyGpsCoords(loc);
          setIsGpsBroadcasting(true);
          setCameraCommand({
            center: { lat: loc.latitude, lng: loc.longitude },
            zoom: 15,
            timestamp: Date.now(),
          });
        });
      } else if (myGpsCoords) {
        setCameraCommand({
          center: { lat: myGpsCoords.latitude, lng: myGpsCoords.longitude },
          zoom: 15,
          timestamp: Date.now(),
        });
      }
    } catch {
      // Handled gracefully
    } finally {
      setIsLocating(false);
    }
  };

  const nyakato = MWANZA_HUBS.DEPOT_NYAKATO;

  // Compute polyline routes from Nyakato Plant to active trucks
  const activeRoutes = fleet
    .filter((d) => d.isOnline && d.status !== 'idle')
    .map((d) => ({
      id: d.userId,
      from: { lat: nyakato.lat, lng: nyakato.lng },
      to: { lat: d.latitude, lng: d.longitude },
      color: d.status === 'at_customer' ? '#3B82F6' : '#00C46A',
    }));

  // Selected driver distance from Nyakato Central RO Plant
  const selectedDriverDistance = selectedDriver
    ? calculateDistanceKm(
        nyakato.lat,
        nyakato.lng,
        selectedDriver.latitude,
        selectedDriver.longitude
      )
    : null;

  // Regional substations array
  const regionalSubHubs = [
    MWANZA_HUBS.CAPRIPOINT_WATERFRONT,
    MWANZA_HUBS.POSTA_CBD,
    MWANZA_HUBS.BUZURUGA_PLAZA,
    MWANZA_HUBS.KIRUMBA_STADIUM,
    MWANZA_HUBS.PASIANSI_AIRPORT,
    MWANZA_HUBS.NYEGEZI_TERMINAL,
    MWANZA_HUBS.IGOMA_JUNCTION,
  ];

  return (
    <div
      className={`bg-[#122010] rounded-2xl border border-[#2A5038] shadow-xl overflow-hidden relative flex flex-col ${className}`}
    >
      {/* 1. Header Toolbar */}
      <div className="p-4 sm:p-5 border-b border-[#2A5038] flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#0E1A0E]">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-[#006B3C]/30 text-[#00C46A] border border-[#00C46A]/30">
              <Compass className="w-4 h-4" />
            </div>
            <h2 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
              <span>{isSwahili ? 'Ramani ya Ugani Mwanza' : 'Mwanza Operations Area Live Map'}</span>
              <span className="text-[10px] font-mono font-bold bg-[#1A73E8]/20 text-[#60A5FA] px-2 py-0.5 rounded-full border border-[#1A73E8]/40 uppercase tracking-wider flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#3B82F6]"></span>
                Google Maps
              </span>
            </h2>
          </div>
          <p className="text-xs text-[#8899AA] mt-1 flex items-center gap-2 flex-wrap">
            <span>Lake Victoria Logistics Corridor</span>
            <span>&bull;</span>
            <span>Anchor: Nyakato Central RO Bottling Plant</span>
            <span>&bull;</span>
            <span className="text-[#00C46A] font-semibold flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-[#00C46A] animate-pulse"></span>
              <span>{fleet.filter((d) => d.isOnline).length} Trucks Live</span>
            </span>
          </p>
        </div>

        {/* Action Controls & Map Style Selector */}
        <div className="flex items-center gap-2 flex-wrap self-end sm:self-auto">
          {/* Map Type Switcher (Roadmap, Satellite, Terrain, Hybrid) */}
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
                onClick={() => setMapType(t.key)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all ${
                  mapType === t.key
                    ? 'bg-[#006B3C] text-white shadow-xs font-semibold'
                    : 'text-[#8899AA] hover:text-white'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Recenter / Focus Mwanza Operations Zone */}
          <button
            type="button"
            onClick={handleFitMwanzaArea}
            title="Reset view to Mwanza Operations Zone"
            className="p-2 rounded-xl bg-[#1A2E1C] hover:bg-[#253D28] text-white border border-[#3A5068]/60 hover:border-[#00C46A] transition-all"
          >
            <Crosshair className="w-4 h-4 text-[#00C46A]" />
          </button>

          {/* Supervisor View Navigation */}
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

      {/* 2. Interactive Google Map Container */}
      <div
        className="relative w-full overflow-hidden bg-[#0A1A0F]"
        style={{ height: typeof height === 'number' ? `${height}px` : height }}
      >
        <GoogleMapsProvider
          apiKey={GOOGLE_MAPS_API_KEY}
          libraries={['marker', 'geometry', 'places']}
        >
          <Map
            mapId="DEMO_MAP_ID"
            defaultCenter={MWANZA_CENTER}
            defaultZoom={MWANZA_DEFAULT_ZOOM}
            mapTypeId={mapType}
            gestureHandling="greedy"
            disableDefaultUI={false}
            zoomControl={true}
            mapTypeControl={false}
            streetViewControl={false}
            fullscreenControl={false}
            internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
            style={{ width: '100%', height: '100%' }}
          >
            {/* Geofence Boundary Polygon */}
            <MwanzaZonePolygon
              paths={MWANZA_OPERATIONS_ZONE_PATH}
              visible={showZoneBoundary}
            />

            {/* Dynamic Delivery Polylines */}
            <MwanzaRouteLines routes={activeRoutes} visible={showRoutes} />

            {/* Programmatic Camera Controller */}
            <MapCameraController command={cameraCommand} />

            {/* Central Depot: Nyakato Bottling Plant */}
            {showHubs && (
              <AdvancedMarker
                position={{ lat: nyakato.lat, lng: nyakato.lng }}
                title={nyakato.name}
                zIndex={1000}
                onClick={() => {
                  setSelectedHub(nyakato);
                  setSelectedDriver(null);
                }}
              >
                <div className="relative flex items-center justify-center cursor-pointer group select-none">
                  <div className="absolute -inset-3 rounded-full bg-[#00C46A]/25 animate-ping"></div>
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

            {/* Regional Substations */}
            {showHubs &&
              regionalSubHubs.map((hub) => (
                <AdvancedMarker
                  key={hub.id}
                  position={{ lat: hub.lat, lng: hub.lng }}
                  title={hub.name}
                  zIndex={400}
                  onClick={() => {
                    setSelectedHub(hub);
                    setSelectedDriver(null);
                  }}
                >
                  <div className="relative flex items-center justify-center cursor-pointer group select-none">
                    <div className="w-8 h-8 rounded-xl bg-[#0A1A0F] border border-[#00C46A]/60 shadow-lg flex items-center justify-center text-[#00C46A] group-hover:scale-110 transition-transform">
                      <MapPin className="w-4 h-4 text-[#00C46A]" />
                    </div>
                    <div className="absolute -bottom-4 bg-[#0A1A0F]/90 text-gray-200 text-[8px] font-semibold px-1.5 py-0.5 rounded border border-[#243447] whitespace-nowrap shadow">
                      {hub.shortName}
                    </div>
                  </div>
                </AdvancedMarker>
              ))}

            {/* Live Field Fleet Truck Markers */}
            {fleet.map((driver) => {
              const isSelected = selectedDriver?.userId === driver.userId;

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

              return (
                <AdvancedMarker
                  key={driver.userId}
                  position={{ lat: driver.latitude, lng: driver.longitude }}
                  title={`${driver.staffName} (${driver.employeeId})`}
                  zIndex={isSelected ? 1200 : 600}
                  onClick={() => {
                    setSelectedDriver(driver);
                    setSelectedHub(null);
                    setCameraCommand({
                      center: { lat: driver.latitude, lng: driver.longitude },
                      zoom: 15,
                      timestamp: Date.now(),
                    });
                  }}
                >
                  <div className="relative cursor-pointer group select-none">
                    {driver.speed && driver.speed > 5 && (
                      <div className={`absolute -inset-2 rounded-full ${ringColor} animate-ping`} />
                    )}
                    <div
                      className={`w-10 h-10 rounded-2xl ${statusBg} ${statusBorder} border-2 shadow-2xl flex flex-col items-center justify-center text-white font-bold relative transition-transform group-hover:scale-110 ${
                        isSelected ? 'ring-4 ring-white shadow-emerald-500/50' : ''
                      }`}
                    >
                      <Truck className="w-4 h-4 text-white" />
                      <span className="text-[7.5px] tracking-tight leading-none">
                        {driver.employeeId.slice(-6)}
                      </span>
                    </div>
                    <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 bg-[#0A1A0F]/95 text-white text-[9px] font-semibold px-2 py-0.5 rounded-full border border-[#243447] whitespace-nowrap shadow-lg flex items-center gap-1">
                      <span className={`w-1.5 h-1.5 rounded-full ${statusBg}`}></span>
                      <span>{driver.staffName.split(' ')[0]}</span>
                      <span className="text-[#8899AA] font-mono">{speedDisplay}</span>
                    </div>
                  </div>
                </AdvancedMarker>
              );
            })}

            {/* Current User Live GPS Beacon */}
            {myGpsCoords && (
              <AdvancedMarker
                position={{ lat: myGpsCoords.latitude, lng: myGpsCoords.longitude }}
                title="Your Location"
                zIndex={1500}
              >
                <div className="relative flex items-center justify-center select-none">
                  <div className="absolute -inset-3 rounded-full bg-emerald-400/30 animate-ping"></div>
                  <div className="w-7 h-7 rounded-full bg-[#00C46A] border-2 border-white shadow-xl flex items-center justify-center text-[#0A1A0F]">
                    <div className="w-2.5 h-2.5 rounded-full bg-white"></div>
                  </div>
                  <div className="absolute -bottom-4 bg-[#0A1A0F]/90 text-white text-[8px] font-bold px-1.5 py-0.5 rounded border border-[#00C46A]/40 whitespace-nowrap shadow">
                    You
                  </div>
                </div>
              </AdvancedMarker>
            )}
          </Map>
        </GoogleMapsProvider>

        {/* Floating Quick Action Overlay (Top Left inside Map) */}
        <div className="absolute top-3 left-3 z-10 flex flex-col gap-2">
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
        <div className="absolute bottom-3 left-3 z-10 bg-[#0A1A0F]/90 backdrop-blur-md p-2.5 rounded-xl border border-[#2A5038] shadow-xl max-w-xs text-[11px] hidden sm:block">
          <div className="flex items-center justify-between gap-4 font-semibold text-white mb-1">
            <span className="flex items-center gap-1.5 text-[#00C46A]">
              <Radio className="w-3 h-3 animate-pulse" />
              <span>Google Maps Engine</span>
            </span>
            <span className="text-[10px] text-[#60A5FA] font-mono">
              Live Mwanza
            </span>
          </div>
          <div className="text-[10px] text-[#8899AA] flex items-center justify-between gap-3 pt-1 border-t border-[#243447]">
            <span>Active Sector: Lake Victoria Basin</span>
            <span className="text-white font-mono">
              {lastRefreshed.toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
              })}
            </span>
          </div>
        </div>

        {/* Floating Inspection Card when a Driver is Selected */}
        {selectedDriver && (
          <div className="absolute bottom-3 right-3 sm:right-4 z-20 w-[calc(100%-24px)] sm:w-80 bg-[#0A1A0F]/95 backdrop-blur-md p-4 rounded-2xl border border-[#00C46A]/60 shadow-2xl animate-fade-in text-xs">
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
                <span className="font-semibold text-white truncate max-w-[180px]">
                  {selectedDriver.currentStop || 'In Transit'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#8899AA]">Route Corridor:</span>
                <span className="text-[#00C46A] truncate max-w-[180px]">
                  {selectedDriver.assignedRoute}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#8899AA]">Truck Inventory:</span>
                <span className="font-mono text-white font-bold">
                  {selectedDriver.truckStock?.bottles18_9L ?? 0}x 18.9L |{' '}
                  {selectedDriver.truckStock?.bottles13L ?? 0}x 13L
                </span>
              </div>
              {selectedDriverDistance !== null && (
                <div className="flex justify-between">
                  <span className="text-[#8899AA]">From Central Plant:</span>
                  <span className="font-mono text-[#F59E0B] font-semibold">
                    {selectedDriverDistance.toFixed(1)} km
                  </span>
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
            <Radio
              className={`w-3.5 h-3.5 ${
                isGpsBroadcasting ? 'animate-pulse text-[#00C46A]' : ''
              }`}
            />
            <span>{isGpsBroadcasting ? 'GPS Live: On' : 'Broadcast My GPS'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default GoogleMapsLiveMap;
