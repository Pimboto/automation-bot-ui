import { useState, useEffect, useCallback } from 'react';
import { apiService, FlowsResponse, FlowConfig } from '@/services/api';
import { cacheManager, CACHE_KEYS, CACHE_TTL } from '@/utils/cache';

interface UseFlowsReturn {
  flows: FlowConfig[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  getFlowByName: (name: string) => FlowConfig | undefined;
}

interface UseFlowConfigReturn {
  flowConfig: FlowConfig | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

// Hook for all flows
export function useFlows(): UseFlowsReturn {
  const [flows, setFlows] = useState<FlowConfig[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch flows from API with cache
  const fetchFlows = useCallback(async (bypassCache = false): Promise<void> => {
    try {
      setError(null);
      
      // Try cache first if not bypassing
      if (!bypassCache) {
        const cachedData = cacheManager.getLocalStorage<FlowsResponse>(CACHE_KEYS.AUTOMATION_FLOWS);
        if (cachedData) {
          setFlows(cachedData.flows);
          setIsLoading(false);
          return;
        }
      }

      // Fetch from API
      const response = await apiService.getAutomationFlows();
      setFlows(response.flows);
      
      // Save to cache
      cacheManager.setLocalStorage(CACHE_KEYS.AUTOMATION_FLOWS, response, CACHE_TTL.MEDIUM);
      
    } catch (err) {
      console.error('Error fetching flows:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch automation flows');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Refetch (bypass cache)
  const refetch = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    await fetchFlows(true);
  }, [fetchFlows]);

  // Get flow by name helper
  const getFlowByName = useCallback((name: string): FlowConfig | undefined => {
    return flows.find(flow => flow.name === name);
  }, [flows]);

  // Initial load
  useEffect(() => {
    fetchFlows();
  }, [fetchFlows]);

  return {
    flows,
    isLoading,
    error,
    refetch,
    getFlowByName,
  };
}

// Hook for specific flow configuration
export function useFlowConfig(flowName: string): UseFlowConfigReturn {
  const { flows, isLoading, error, getFlowByName, refetch } = useFlows();
  
  const flowConfig = flowName ? (getFlowByName(flowName) || null) : null;

  return {
    flowConfig,
    isLoading,
    error,
    refetch,
  };
}

// Hook to clear flows cache
export function useClearFlowsCache(): () => void {
  return useCallback(() => {
    cacheManager.removeLocalStorage(CACHE_KEYS.AUTOMATION_FLOWS);
    console.log('Flows cache cleared');
  }, []);
}

// Hook to get cache statistics (useful for debugging)
export function useFlowsCacheStats(): () => { hasCache: boolean; cacheAge?: number } {
  return useCallback(() => {
    const cached = cacheManager.getLocalStorage<FlowsResponse>(CACHE_KEYS.AUTOMATION_FLOWS);
    return {
      hasCache: !!cached,
      cacheAge: cached ? Date.now() - JSON.parse(localStorage.getItem(CACHE_KEYS.AUTOMATION_FLOWS) ?? '{}').timestamp : undefined,
    };
  }, []);
}
