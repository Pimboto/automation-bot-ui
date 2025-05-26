"use client";
import React, { useState, useEffect } from 'react';
import { apiService, Device, getDeviceType, getDeviceStatusColor, formatTimestamp } from '@/services/api';
import Badge from "../ui/badge/Badge";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHeader, 
  TableRow 
} from '../ui/table';

interface DevicesListProps {
  onDeviceSelect?: (device: Device) => void;
  selectedDevice?: Device | null;
  showActions?: boolean;
}

const DevicesList: React.FC<DevicesListProps> = ({ 
  onDeviceSelect, 
  selectedDevice, 
  showActions = true 
}) => {
  const [devices, setDevices] = useState<Device[]>([]);
  const [availableDevices, setAvailableDevices] = useState<Device[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showOnlyAvailable, setShowOnlyAvailable] = useState(false);

  const fetchDevices = async () => {
    try {
      setError(null);
      const [allDevices, availableDevicesRes] = await Promise.all([
        apiService.getDevices(),
        apiService.getAvailableDevices()
      ]);
      
      setDevices(allDevices.devices);
      setAvailableDevices(availableDevicesRes.devices);
    } catch (err) {
      console.error('Error fetching devices:', err);
      setError('Failed to load devices');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDevices();
    
    // Poll every 10 seconds to keep device status updated
    const interval = setInterval(fetchDevices, 10000);
    return () => clearInterval(interval);
  }, []);

  const displayDevices = showOnlyAvailable ? availableDevices : devices;

  const getDeviceIcon = (name: string) => {
    const type = getDeviceType(name);
    switch (type) {
      case 'iPhone':
        return '📱';
      case 'iPad':
        return '📱';
      case 'Simulator':
        return '🖥️';
      default:
        return '📱';
    }
  };

  const handleDeviceClick = (device: Device) => {
    if (onDeviceSelect && device.isAvailable) {
      onDeviceSelect(device);
    }
  };

  const handleRefresh = () => {
    setIsLoading(true);
    fetchDevices();
  };

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-5 w-5 rounded-full bg-red-500" />
            <div>
              <h3 className="text-sm font-medium text-red-800 dark:text-red-200">
                Error Loading Devices
              </h3>
              <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
            </div>
          </div>
          <button
            onClick={handleRefresh}
            className="rounded bg-red-100 px-3 py-1 text-sm text-red-800 hover:bg-red-200 dark:bg-red-800 dark:text-red-200 dark:hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
            Devices ({displayDevices.length})
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {availableDevices.length} available • {devices.length - availableDevices.length} in use
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={showOnlyAvailable}
              onChange={(e) => setShowOnlyAvailable(e.target.checked)}
              className="rounded border-gray-300 text-brand-500 focus:ring-brand-500"
            />
            Show only available
          </label>
          <button
            onClick={handleRefresh}
            disabled={isLoading}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
          >
            {isLoading ? '🔄' : '🔄'} Refresh
          </button>
        </div>
      </div>

      {/* Devices Table */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="max-w-full overflow-x-auto">
          <Table>
            <TableHeader className="border-b border-gray-100 dark:border-gray-800">
              <TableRow>
                <TableCell
                  isHeader
                  className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                >
                  Device
                </TableCell>
                <TableCell
                  isHeader
                  className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                >
                  Version
                </TableCell>
                <TableCell
                  isHeader
                  className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                >
                  Status
                </TableCell>
                <TableCell
                  isHeader
                  className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                >
                  Last Detected
                </TableCell>
                {showActions && (
                  <TableCell
                    isHeader
                    className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                  >
                    Action
                  </TableCell>
                )}
              </TableRow>
            </TableHeader>

            <TableBody className="divide-y divide-gray-100 dark:divide-gray-800">
              {isLoading ? (
                // Loading skeleton
                [...Array(3)].map((_, i) => (
                  <TableRow key={i}>
                    <TableCell className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
                        <div>
                          <div className="h-4 w-24 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
                          <div className="mt-1 h-3 w-32 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="px-5 py-4">
                      <div className="h-4 w-16 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
                    </TableCell>
                    <TableCell className="px-5 py-4">
                      <div className="h-6 w-20 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
                    </TableCell>
                    <TableCell className="px-5 py-4">
                      <div className="h-4 w-32 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
                    </TableCell>
                    {showActions && (
                      <TableCell className="px-5 py-4">
                        <div className="h-8 w-16 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
                      </TableCell>
                    )}
                  </TableRow>
                ))
              ) : displayDevices.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={showActions ? 5 : 4} className="px-5 py-8 text-center">
                    <div className="text-gray-500 dark:text-gray-400">
                      <p className="text-lg">📱</p>
                      <p className="mt-2">No devices found</p>
                      <p className="text-sm">
                        {showOnlyAvailable 
                          ? 'No available devices at the moment' 
                          : 'No devices are currently connected'
                        }
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                displayDevices.map((device) => (
                  <TableRow 
                    key={device.udid}
                    className={`${
                      onDeviceSelect && device.isAvailable
                        ? 'cursor-pointer hover:bg-gray-50 dark:hover:bg-white/[0.02]'
                        : ''
                    } ${
                      selectedDevice?.udid === device.udid
                        ? 'bg-brand-50 dark:bg-brand-500/10'
                        : ''
                    }`}
                    onClick={() => handleDeviceClick(device)}
                  >
                    <TableCell className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="text-2xl">
                          {getDeviceIcon(device.name)}
                        </div>
                        <div>
                          <p className="font-medium text-gray-800 dark:text-white/90">
                            {device.name}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                            {device.udid}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="px-5 py-4 text-sm text-gray-600 dark:text-gray-400">
                      {device.version}
                    </TableCell>
                    <TableCell className="px-5 py-4">
                      <Badge
                        size="sm"
                        color={getDeviceStatusColor(device.isAvailable, device.inUseBy)}
                      >
                        {device.inUseBy 
                          ? 'In Use' 
                          : device.isAvailable 
                            ? 'Available' 
                            : 'Offline'
                        }
                      </Badge>
                    </TableCell>
                    <TableCell className="px-5 py-4 text-sm text-gray-600 dark:text-gray-400">
                      {formatTimestamp(device.lastDetected)}
                    </TableCell>
                    {showActions && (
                      <TableCell className="px-5 py-4">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeviceClick(device);
                          }}
                          disabled={!device.isAvailable}
                          className="inline-flex items-center rounded bg-brand-500 px-2 py-1 text-xs font-medium text-white hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {selectedDevice?.udid === device.udid ? 'Selected' : 'Select'}
                        </button>
                      </TableCell>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
};

export default DevicesList;
