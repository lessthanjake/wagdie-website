'use client';

import { useState, useEffect } from 'react';
import type { Location, CharacterLocation } from '@/lib/types/map';

export function useMapData() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [characterLocations, setCharacterLocations] = useState<CharacterLocation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function fetchData() {
      // Guard against SSR
      if (typeof window === 'undefined') return;

      try {
        console.log('[useMapData] Starting fetch with mock data...');
        setIsLoading(true);

        // Dynamically import repositories to get mock data
        const { LocationRepository } = await import('@/lib/repositories/locationRepository');
        const { CharacterLocationRepository } = await import('@/lib/repositories/characterLocationRepository');

        const locationRepo = new LocationRepository();
        const charLocationRepo = new CharacterLocationRepository();

        // Use getMockData methods directly for immediate demo
        console.log('[useMapData] Fetching mock data...');
        const locationsData = locationRepo.getMockLocations();
        const characterLocationsData = charLocationRepo.getMockCharacterLocations();

        console.log('[useMapData] Mock data loaded:', { locations: locationsData.length, characters: characterLocationsData.length });
        setLocations(locationsData);
        setCharacterLocations(characterLocationsData);
        setError(null);
      } catch (err) {
        console.error('[useMapData] Failed to fetch map data:', err);
        setError(err as Error);
      } finally {
        setIsLoading(false);
        console.log('[useMapData] Set loading to false');
      }
    }

    fetchData();
  }, []);

  return { locations, characterLocations, isLoading, error };
}
