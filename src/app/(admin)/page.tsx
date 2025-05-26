"use client";
import React, { useState } from "react";
import { RealMetrics } from "@/components/ecommerce/RealMetrics";
import SystemMetrics from "@/components/automation/SystemMetrics";
import { useMetrics } from "@/hooks/useMetrics";


interface StatusIndicatorProps {
  isConnected: boolean;
  lastUpdated: Date | null;
}

const StatusIndicator: React.FC<StatusIndicatorProps> = ({ isConnected, lastUpdated }) => {
  return (
    <div className="mb-6 flex items-center justify-between rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03]">
      <div className="flex items-center gap-3">
        <div
          className={`h-3 w-3 rounded-full ${
            isConnected ? 'bg-green-500' : 'bg-red-500'
          }`}
        />
        <div>
          <p className="text-sm font-medium text-gray-800 dark:text-white/90">
            API Status: {isConnected ? 'Connected' : 'Disconnected'}
          </p>
          {lastUpdated && (
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Last updated: {lastUpdated.toLocaleTimeString()}
            </p>
          )}
        </div>
      </div>
      {isConnected && (
        <div className="flex items-center gap-1">
          <div className="h-2 w-2 animate-pulse rounded-full bg-green-500" />
          <span className="text-xs text-gray-500 dark:text-gray-400">Live</span>
        </div>
      )}
    </div>
  );
};

export default function Dashboard() {
  const { data, isLoading, error, refetch, lastUpdated } = useMetrics(30000); // Poll every 30 seconds
  const [showError, setShowError] = useState(true);

  const handleRefresh = async () => {
    await refetch();
    setShowError(true);
  };

  const isConnected = !error && data !== null;

  return (
    <div className="space-y-6">
      {/* Status Indicator */}
      <StatusIndicator isConnected={isConnected} lastUpdated={lastUpdated} />

      {/* Error Alert */}
      {error && showError && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-5 w-5 rounded-full bg-red-500" />
              <div>
                <h3 className="text-sm font-medium text-red-800 dark:text-red-200">
                  Connection Error
                </h3>
                <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleRefresh}
                className="rounded bg-red-100 px-3 py-1 text-sm text-red-800 hover:bg-red-200 dark:bg-red-800 dark:text-red-200 dark:hover:bg-red-700"
              >
                Retry
              </button>
              <button
                onClick={() => setShowError(false)}
                className="text-red-500 hover:text-red-600"
              >
                ×
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Dashboard Grid */}
      <div className="grid grid-cols-12 gap-4 md:gap-6">
        {/* Metrics Section */}
        <div className="col-span-12 space-y-6 xl:col-span-8">
          <RealMetrics />
{/*           <AutomationChart /> */}
        </div>

        {/* System Status Section */}
        <div className="col-span-12 xl:col-span-4">
          <SystemMetrics />
        </div>

        {/* Full Width Chart */}
        <div className="col-span-12">
          {/* You can add another chart here if needed */}
          <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] sm:p-6">
            <h3 className="mb-4 text-lg font-semibold text-gray-800 dark:text-white/90">
              Quick Stats
            </h3>
            {isLoading ? (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="text-center">
                    <div className="mx-auto mb-2 h-8 w-16 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
                    <div className="mx-auto h-4 w-20 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
                  </div>
                ))}
              </div>
            ) : data ? (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-blue-600">
                    {data.metrics.automation.totalSessions}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Total Sessions</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-600">
                    {data.metrics.device.available}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Available Devices</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-orange-600">
                    {data.metrics.api.requestCount}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">API Requests</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-purple-600">
                    {data.metrics.appium.activeServers}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Active Servers</p>
                </div>
              </div>
            ) : (
              <div className="text-center text-gray-500 dark:text-gray-400">
                No data available
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Loading Overlay */}
      {isLoading && !data && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm">
          <div className="rounded-lg bg-white p-6 shadow-lg dark:bg-gray-800">
            <div className="flex items-center gap-3">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
              <p className="text-gray-700 dark:text-gray-300">Loading dashboard...</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
