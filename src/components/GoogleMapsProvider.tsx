import React, { createContext, useContext, useState, ReactNode } from 'react';
import { APIProvider } from '@vis.gl/react-google-maps';

export interface GoogleMapsContextType {
  apiKey: string;
  isLoaded: boolean;
  loadError: string | null;
  libraries: string[];
}

const GoogleMapsContext = createContext<GoogleMapsContextType | null>(null);

export const useGoogleMaps = (): GoogleMapsContextType => {
  const context = useContext(GoogleMapsContext);
  if (!context) {
    // Return a default state rather than throwing if used outside provider
    const defaultKey =
      (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_GOOGLE_MAPS_API_KEY) ||
      'AIzaSyDn5f3kuL4ByNDovy7jvcXwkJ5B7Us4_zA';
    return {
      apiKey: defaultKey,
      isLoaded: true,
      loadError: null,
      libraries: ['marker', 'geometry', 'places'],
    };
  }
  return context;
};

export interface GoogleMapsProviderProps {
  apiKey?: string;
  libraries?: string[];
  children: ReactNode;
  fallback?: ReactNode;
  onLoad?: () => void;
  onError?: (error: unknown) => void;
}

// Fallback API key provisioned for Google Maps Platform in Google AI Studio
export const DEFAULT_FALLBACK_API_KEY = 'AIzaSyDn5f3kuL4ByNDovy7jvcXwkJ5B7Us4_zA';

/**
 * GoogleMapsProvider
 * Wraps @vis.gl/react-google-maps APIProvider using the environment variable
 * VITE_GOOGLE_MAPS_API_KEY with robust fallback, error handling, and state context.
 */
export const GoogleMapsProvider: React.FC<GoogleMapsProviderProps> = ({
  apiKey,
  libraries = ['marker', 'geometry', 'places'],
  children,
  fallback,
  onLoad,
  onError,
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Retrieve API key from prop, then env variable, then default provisioned key
  const envKey =
    typeof import.meta !== 'undefined' && import.meta.env
      ? import.meta.env.VITE_GOOGLE_MAPS_API_KEY
      : undefined;

  const resolvedApiKey = apiKey || envKey || DEFAULT_FALLBACK_API_KEY;

  const handleLoad = () => {
    setIsLoaded(true);
    setLoadError(null);
    onLoad?.();
  };

  const handleError = (error: unknown) => {
    const errorMsg = error instanceof Error ? error.message : 'Failed to load Google Maps SDK';
    setLoadError(errorMsg);
    onError?.(error);
    console.warn('Google Maps Provider Error:', error);
  };

  const contextValue: GoogleMapsContextType = {
    apiKey: resolvedApiKey,
    isLoaded,
    loadError,
    libraries,
  };

  return (
    <GoogleMapsContext.Provider value={contextValue}>
      <APIProvider
        apiKey={resolvedApiKey}
        libraries={libraries}
        onLoad={handleLoad}
        onError={handleError}
        solutionChannel="gmp_mcp_codeassist_v1_aistudio"
      >
        {loadError && fallback ? fallback : children}
      </APIProvider>
    </GoogleMapsContext.Provider>
  );
};

export default GoogleMapsProvider;
