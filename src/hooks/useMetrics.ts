"use client";
import { useState, useEffect, useCallback } from 'react';
import { apiService, MetricsResponse } from '@/services/api';

interface UseMetricsReturn {
  data: MetricsResponse | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  lastUpdated: Date | null;
}

export const useMetrics = (pollingInterval: number = 30000): UseMetricsReturn => {
  const [data, setData] = useState<MetricsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchMetrics = useCallback(async () => {
    try {
      setError(null);
      const metrics = await apiService.getMetrics();
      setData(metrics);
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Error fetching metrics:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch metrics');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const refetch = useCallback(async () => {
    setIsLoading(true);
    await fetchMetrics();
  }, [fetchMetrics]);

  useEffect(() => {
    fetchMetrics();

    if (pollingInterval > 0) {
      const interval = setInterval(fetchMetrics, pollingInterval);
      return () => clearInterval(interval);
    }
  }, [fetchMetrics, pollingInterval]);

  return {
    data,
    isLoading,
    error,
    refetch,
    lastUpdated,
  };
};
