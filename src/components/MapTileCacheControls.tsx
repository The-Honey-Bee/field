import React, { useState, useEffect } from 'react';
import {
  mapTileCache,
  MapCacheStats,
  PLANT_COORDINATES,
} from '../services/mapTileCache';
import { useLanguage } from '../context/LanguageContext';
import {
  DownloadCloud,
  HardDrive,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Wifi,
  WifiOff,
  MapPin,
  RefreshCw,
  Layers,
  ChevronDown,
  ChevronUp,
  X,
  Compass,
} from 'lucide-react';

interface MapTileCacheControlsProps {
  onFlyToPlant?: () => void;
  className?: string;
}

export const MapTileCacheControls: React.FC<MapTileCacheControlsProps> = ({
  onFlyToPlant,
  className = '',
}) => {
  const { isSwahili } = useLanguage();
  const [stats, setStats] = useState<MapCacheStats>({
    totalTiles: 0,
    totalSizeBytes: 0,
    formattedSize: '0 KB',
    plantTilesCount: 0,
    isPlantFullyCached: false,
    lastPrecacheTime: null,
    isSimulatedOffline: false,
  });

  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [isPrecaching, setIsPrecaching] = useState<boolean>(false);
  const [progress, setProgress] = useState<{
    cachedCount: number;
    totalCount: number;
    currentZoom: number;
    percent: number;
    statusText: string;
  } | null>(null);

  useEffect(() => {
    const unsub = mapTileCache.subscribe((newStats) => {
      setStats(newStats);
    });
    return unsub;
  }, []);

  const handlePrecache = async () => {
    if (isPrecaching) return;
    setIsPrecaching(true);
    setProgress({
      cachedCount: 0,
      totalCount: 0,
      currentZoom: 12,
      percent: 0,
      statusText: isSwahili ? 'Inatayarisha ramani...' : 'Preparing plant tiles...',
    });

    try {
      await mapTileCache.precachePlantArea({
        minZoom: 12,
        maxZoom: 17,
        onProgress: (p) => {
          setProgress(p);
        },
      });
    } catch (err) {
      console.error('Failed to precache plant tiles:', err);
    } finally {
      setIsPrecaching(false);
      setTimeout(() => {
        setProgress(null);
      }, 3500);
    }
  };

  const handleClearCache = async () => {
    if (
      window.confirm(
        isSwahili
          ? 'Je, una uhakika unataka kufuta ramani zilizohifadhiwa kwenye IndexedDB?'
          : 'Are you sure you want to clear all cached map tiles from IndexedDB?'
      )
    ) {
      await mapTileCache.clearCache();
    }
  };

  const handleToggleOfflineSimulation = () => {
    mapTileCache.setSimulatedOffline(!stats.isSimulatedOffline);
  };

  return (
    <div className={`relative ${className}`}>
      {/* Floating Cache Badge / Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all shadow-md ${
          stats.isSimulatedOffline
            ? 'bg-amber-950/80 text-amber-300 border-amber-500/70 animate-pulse'
            : stats.plantTilesCount > 0
            ? 'bg-emerald-950/70 hover:bg-emerald-900/90 text-[#00C46A] border-[#00C46A]/50 hover:border-[#00C46A]'
            : 'bg-[#1A2E1C] hover:bg-[#243B27] text-[#8899AA] hover:text-white border-[#3A5068]/50'
        }`}
        title={isSwahili ? 'Hifadhi ya Ramani ya Offline (IndexedDB)' : 'Plant Offline Map Cache (IndexedDB)'}
      >
        <HardDrive className="w-3.5 h-3.5 text-[#00C46A]" />
        <span className="hidden sm:inline">
          {stats.isSimulatedOffline
            ? isSwahili
              ? 'Nje ya Mtandao (Jaribio)'
              : 'Offline Mode (Simulated)'
            : isSwahili
            ? 'Ramani Offline'
            : 'Plant Offline Cache'}
        </span>
        <span className="px-1.5 py-0.5 rounded-md text-[10px] font-mono bg-black/40 text-emerald-300 border border-emerald-500/30">
          {stats.plantTilesCount > 0 ? `${stats.plantTilesCount} tiles` : '0'}
        </span>
        {isOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
      </button>

      {/* Expanded Modal / Dropdown Card */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-[#0E1A10] border border-[#00C46A]/40 rounded-2xl p-4 shadow-2xl z-[1000] text-white backdrop-blur-md">
          {/* Header */}
          <div className="flex items-start justify-between pb-3 border-b border-[#243447]">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-900/50 flex items-center justify-center border border-emerald-500/40 text-[#00C46A]">
                <HardDrive className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                  <span>{isSwahili ? 'Hifadhi ya Ramani ya Kiwanda' : 'Plant Offline Map Engine'}</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-[#00C46A] border border-emerald-500/30 font-mono">
                    IndexedDB
                  </span>
                </h4>
                <p className="text-[11px] text-[#8899AA]">
                  {isSwahili
                    ? 'Inafanya kazi bila mtandao katika ghala na karakana'
                    : 'Ensures map works in dead-zones, cellars & loading bays'}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-[#8899AA] hover:text-white p-1 rounded-lg hover:bg-white/10"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Plant Coordinates Notice */}
          <div className="my-3 p-2.5 rounded-xl bg-[#142316] border border-[#243B27] flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-[#00C46A] shrink-0" />
              <div>
                <p className="font-semibold text-white">{PLANT_COORDINATES.name}</p>
                <p className="text-[11px] text-emerald-400 font-mono">
                  {PLANT_COORDINATES.lat.toFixed(6)}, {PLANT_COORDINATES.lng.toFixed(6)}
                </p>
              </div>
            </div>
            {onFlyToPlant && (
              <button
                type="button"
                onClick={onFlyToPlant}
                className="px-2 py-1 rounded-lg bg-[#006B3C] hover:bg-[#00874C] text-white text-[11px] font-medium transition-all shadow-sm shrink-0"
                title={isSwahili ? 'Nenda kiwandani' : 'Center map on plant'}
              >
                {isSwahili ? 'Kiwandani' : 'Fly To'}
              </button>
            )}
          </div>

          {/* Cache Metrics Grid */}
          <div className="grid grid-cols-2 gap-2 mb-3 text-xs">
            <div className="p-2.5 rounded-xl bg-black/30 border border-[#243B27]">
              <span className="text-[11px] text-[#8899AA] block">
                {isSwahili ? 'Vipande vya Kiwanda' : 'Plant Area Tiles'}
              </span>
              <span className="text-base font-bold font-mono text-[#00C46A]">
                {stats.plantTilesCount} <span className="text-xs font-normal text-gray-400">tiles</span>
              </span>
              <span className="block text-[10px] text-gray-400 mt-0.5">Zoom levels 12 - 17</span>
            </div>

            <div className="p-2.5 rounded-xl bg-black/30 border border-[#243B27]">
              <span className="text-[11px] text-[#8899AA] block">
                {isSwahili ? 'Ukubwa wa Hifadhi' : 'IndexedDB Size'}
              </span>
              <span className="text-base font-bold font-mono text-emerald-300">
                {stats.formattedSize}
              </span>
              <span className="block text-[10px] text-gray-400 mt-0.5">
                {stats.totalTiles} {isSwahili ? 'jumla ya vipande' : 'total tiles'}
              </span>
            </div>
          </div>

          {/* Status Badge */}
          <div className="mb-3 flex items-center justify-between text-xs px-2.5 py-1.5 rounded-lg bg-[#122010] border border-[#243B27]">
            <span className="text-[#8899AA]">
              {isSwahili ? 'Hali ya Kiwanda' : 'Plant Area Readiness'}:
            </span>
            {stats.plantTilesCount >= 30 ? (
              <span className="inline-flex items-center gap-1 font-semibold text-[#00C46A]">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{isSwahili ? 'Imekamilika (Offline Ready)' : 'Cached & Offline Ready'}</span>
              </span>
            ) : stats.plantTilesCount > 0 ? (
              <span className="inline-flex items-center gap-1 font-semibold text-amber-400">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>{isSwahili ? 'Sehemu Imehifadhiwa' : 'Partially Cached'}</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 font-medium text-gray-400">
                <span>{isSwahili ? 'Bado haijahifadhiwa' : 'Not Cached Yet'}</span>
              </span>
            )}
          </div>

          {/* Progress Bar (During Pre-caching) */}
          {progress && (
            <div className="mb-3 p-2.5 rounded-xl bg-emerald-950/80 border border-emerald-500/50">
              <div className="flex items-center justify-between text-xs font-semibold text-emerald-300 mb-1">
                <span>{progress.statusText}</span>
                <span className="font-mono">{progress.percent}%</span>
              </div>
              <div className="w-full h-2 rounded-full bg-black/60 overflow-hidden border border-emerald-500/30">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 to-[#00C46A] transition-all duration-200"
                  style={{ width: `${progress.percent}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] text-gray-400 mt-1">
                <span>Zoom Level: {progress.currentZoom}</span>
                <span>
                  {progress.cachedCount} / {progress.totalCount} tiles
                </span>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-2">
            {/* Precache Button */}
            <button
              type="button"
              onClick={handlePrecache}
              disabled={isPrecaching}
              className={`w-full py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md ${
                isPrecaching
                  ? 'bg-emerald-900/50 text-emerald-300 cursor-wait'
                  : 'bg-gradient-to-r from-[#006B3C] to-[#00874C] hover:from-[#00874C] hover:to-[#00C46A] text-white border border-[#00C46A]/50'
              }`}
            >
              {isPrecaching ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>
                    {isSwahili
                      ? 'Inapakua Vipande vya Ramani...'
                      : 'Downloading & Caching Plant Tiles...'}
                  </span>
                </>
              ) : (
                <>
                  <DownloadCloud className="w-4 h-4 text-emerald-300" />
                  <span>
                    {stats.plantTilesCount >= 30
                      ? isSwahili
                        ? 'Sasisha Hifadhi ya Kiwanda (Re-cache)'
                        : 'Update / Refresh Plant Tiles'
                      : isSwahili
                      ? 'Hifadhi Ramani ya Kiwanda (Pre-cache Offline)'
                      : 'Pre-cache Plant Offline Map Tiles'}
                  </span>
                </>
              )}
            </button>

            {/* Offline Simulation Toggle */}
            <div className="flex items-center justify-between pt-1">
              <button
                type="button"
                onClick={handleToggleOfflineSimulation}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                  stats.isSimulatedOffline
                    ? 'bg-amber-600/30 text-amber-300 border-amber-500/60'
                    : 'bg-[#142316] text-[#8899AA] hover:text-white border-[#243B27]'
                }`}
              >
                {stats.isSimulatedOffline ? (
                  <>
                    <WifiOff className="w-3.5 h-3.5 text-amber-400" />
                    <span>{isSwahili ? 'Hali: Nje ya Mtandao' : 'Simulated: Offline'}</span>
                  </>
                ) : (
                  <>
                    <Wifi className="w-3.5 h-3.5 text-emerald-400" />
                    <span>{isSwahili ? 'Jaribu Bila Mtandao' : 'Test Offline Mode'}</span>
                  </>
                )}
              </button>

              {/* Clear Cache Button */}
              {stats.totalTiles > 0 && (
                <button
                  type="button"
                  onClick={handleClearCache}
                  disabled={isPrecaching}
                  className="flex items-center gap-1 text-xs text-red-400 hover:text-red-300 p-1.5 rounded-lg hover:bg-red-950/40 transition-all"
                  title={isSwahili ? 'Futa ramani zilizohifadhiwa' : 'Purge tile cache'}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{isSwahili ? 'Futa' : 'Clear'}</span>
                </button>
              )}
            </div>
          </div>

          {/* Footer Info */}
          <div className="mt-3 pt-2 border-t border-[#243447] text-[10px] text-[#8899AA] flex items-center justify-between">
            <span>
              {isSwahili ? 'Eneo la Nyakato' : 'Nyakato Compound'} (-2.513339, 32.970645)
            </span>
            {stats.lastPrecacheTime && (
              <span className="text-gray-400 truncate max-w-[140px]">
                {stats.lastPrecacheTime}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
