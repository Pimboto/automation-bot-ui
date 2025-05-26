"use client";
import React, { useEffect, useState } from "react";
import Badge from "../ui/badge/Badge";
import { ArrowDownIcon, ArrowUpIcon, BoxIconLine, GroupIcon } from "@/icons";
import { apiService, AutomationMetrics, DeviceMetrics, formatPercentage } from "@/services/api";

interface MetricsCardProps {
  title: string;
  value: string | number;
  change?: number;
  isLoading?: boolean;
  icon: React.ReactNode;
}

const MetricsCard: React.FC<MetricsCardProps> = ({ 
  title, 
  value, 
  change, 
  isLoading, 
  icon 
}) => {
  const getChangeColor = (change: number) => {
    if (change > 0) return "success";
    if (change < 0) return "error";
    return "warning";
  };

  const getChangeIcon = (change: number) => {
    if (change > 0) return <ArrowUpIcon />;
    if (change < 0) return <ArrowDownIcon className="text-error-500" />;
    return null;
  };

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6">
      <div className="flex items-center justify-center w-12 h-12 bg-gray-100 rounded-xl dark:bg-gray-800">
        {icon}
      </div>

      <div className="flex items-end justify-between mt-5">
        <div>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {title}
          </span>
          <h4 className="mt-2 font-bold text-gray-800 text-title-sm dark:text-white/90">
            {isLoading ? (
              <div className="w-16 h-6 bg-gray-200 rounded animate-pulse dark:bg-gray-700"></div>
            ) : (
              value
            )}
          </h4>
        </div>
        {change !== undefined && !isLoading && (
          <Badge color={getChangeColor(change)}>
            {getChangeIcon(change)}
            {formatPercentage(Math.abs(change))}
          </Badge>
        )}
      </div>
    </div>
  );
};

export const RealMetrics = () => {
  const [automationMetrics, setAutomationMetrics] = useState<AutomationMetrics | null>(null);
  const [deviceMetrics, setDeviceMetrics] = useState<DeviceMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const [automation, device] = await Promise.all([
          apiService.getAutomationMetrics(),
          apiService.getDeviceMetrics()
        ]);
        
        setAutomationMetrics(automation);
        setDeviceMetrics(device);
      } catch (err) {
        console.error('Error fetching metrics:', err);
        setError('Failed to load metrics');
      } finally {
        setIsLoading(false);
      }
    };

    fetchMetrics();

    // Set up polling every 30 seconds
    const interval = setInterval(fetchMetrics, 30000);

    return () => clearInterval(interval);
  }, []);

  if (error) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:gap-6">
        <div className="col-span-full p-4 text-center text-red-500 bg-red-50 rounded-lg dark:bg-red-900/20">
          {error}
        </div>
      </div>
    );
  }

  const calculateSuccessRate = () => {
    if (!automationMetrics || automationMetrics.totalSessions === 0) return 0;
    return (automationMetrics.completedSessions / automationMetrics.totalSessions) * 100;
  };

  const calculateDeviceUsage = () => {
    if (!deviceMetrics || deviceMetrics.total === 0) return 0;
    return (deviceMetrics.inUse / deviceMetrics.total) * 100;
  };

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:gap-6 lg:grid-cols-3">
      {/* Active Sessions */}
      <MetricsCard
        title="Active Sessions"
        value={automationMetrics?.activeSessions ?? 0}
        isLoading={isLoading}
        icon={<GroupIcon className="text-gray-800 size-6 dark:text-white/90" />}
      />

      {/* Total Devices */}
      <MetricsCard
        title="Total Devices"
        value={deviceMetrics?.total ?? 0}
        change={deviceMetrics?.available ? (deviceMetrics.available / deviceMetrics.total) * 100 : 0}
        isLoading={isLoading}
        icon={<BoxIconLine className="text-gray-800 dark:text-white/90" />}
      />

      {/* Available Devices */}
      <MetricsCard
        title="Available Devices"
        value={deviceMetrics?.available ?? 0}
        change={calculateDeviceUsage()}
        isLoading={isLoading}
        icon={<GroupIcon className="text-gray-800 size-6 dark:text-white/90" />}
      />

      {/* Success Rate */}
      <div className="sm:col-span-2 lg:col-span-1">
        <MetricsCard
          title="Success Rate"
          value={`${formatPercentage(calculateSuccessRate())}`}
          change={automationMetrics?.successRate ? (automationMetrics.successRate - 1) * 100 : 0}
          isLoading={isLoading}
          icon={<BoxIconLine className="text-gray-800 dark:text-white/90" />}
        />
      </div>

      {/* Total Likes */}
      <div className="sm:col-span-2 lg:col-span-1">
        <MetricsCard
          title="Total Likes"
          value={automationMetrics?.totalLikes ?? 0}
          isLoading={isLoading}
          icon={<GroupIcon className="text-gray-800 size-6 dark:text-white/90" />}
        />
      </div>

      {/* Completed Sessions */}
      <div className="sm:col-span-2 lg:col-span-1">
        <MetricsCard
          title="Completed Sessions"
          value={automationMetrics?.completedSessions ?? 0}
          isLoading={isLoading}
          icon={<BoxIconLine className="text-gray-800 dark:text-white/90" />}
        />
      </div>
    </div>
  );
};
