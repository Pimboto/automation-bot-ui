"use client";
import React, { useState, useEffect } from "react";
import { ApexOptions } from "apexcharts";
import ChartTab from "../common/ChartTab";
import dynamic from "next/dynamic";
import { apiService, AutomationMetrics } from "@/services/api";

// Dynamically import the ReactApexChart component
const ReactApexChart = dynamic(() => import("react-apexcharts"), {
  ssr: false,
});

export default function AutomationChart() {
  const [automationData, setAutomationData] = useState<AutomationMetrics | null>(null);
  const [historicalData, setHistoricalData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAutomationMetrics = async () => {
      try {
        setError(null);
        const metrics = await apiService.getAutomationMetrics();
        setAutomationData(metrics);
        
        // Simulate historical data for the chart
        // In a real implementation, you'd fetch this from your API
        const currentTime = new Date();
        const newDataPoint = {
          time: currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          likes: metrics.totalLikes,
          nopes: metrics.totalNopes,
          matches: metrics.totalMatches,
          swipes: metrics.totalSwipes
        };
        
        setHistoricalData(prev => {
          const updated = [...prev, newDataPoint];
          // Keep only last 12 data points
          return updated.slice(-12);
        });
        
        setIsLoading(false);
      } catch (err) {
        console.error('Error fetching automation metrics:', err);
        setError('Failed to load automation metrics');
        setIsLoading(false);
      }
    };

    fetchAutomationMetrics();

    // Poll every 30 seconds
    const interval = setInterval(fetchAutomationMetrics, 30000);

    return () => clearInterval(interval);
  }, []);

  const options: ApexOptions = {
    legend: {
      show: false,
      position: "top",
      horizontalAlign: "left",
    },
    colors: ["#465FFF", "#9CB9FF", "#F97066", "#10B981"],
    chart: {
      fontFamily: "Outfit, sans-serif",
      height: 310,
      type: "line",
      toolbar: {
        show: false,
      },
      animations: {
        enabled: true,
        speed: 800,
      },
    },
    stroke: {
      curve: "smooth",
      width: [3, 3, 3, 3],
    },
    fill: {
      type: "gradient",
      gradient: {
        opacityFrom: 0.55,
        opacityTo: 0,
      },
    },
    markers: {
      size: 0,
      strokeColors: "#fff",
      strokeWidth: 2,
      hover: {
        size: 6,
      },
    },
    grid: {
      xaxis: {
        lines: {
          show: false,
        },
      },
      yaxis: {
        lines: {
          show: true,
        },
      },
    },
    dataLabels: {
      enabled: false,
    },
    tooltip: {
      enabled: true,
      shared: true,
      intersect: false,
    },
    xaxis: {
      type: "category",
      categories: historicalData.map(d => d.time),
      axisBorder: {
        show: false,
      },
      axisTicks: {
        show: false,
      },
      tooltip: {
        enabled: false,
      },
    },
    yaxis: {
      labels: {
        style: {
          fontSize: "12px",
          colors: ["#6B7280"],
        },
      },
      title: {
        text: "",
        style: {
          fontSize: "0px",
        },
      },
    },
  };

  const series = [
    {
      name: "Swipes",
      data: historicalData.map(d => d.swipes),
    },
    {
      name: "Likes",
      data: historicalData.map(d => d.likes),
    },
    {
      name: "Matches",
      data: historicalData.map(d => d.matches),
    },
    {
      name: "Nopes",
      data: historicalData.map(d => d.nopes),
    },
  ];

  if (error) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white px-5 pb-5 pt-5 dark:border-gray-800 dark:bg-white/[0.03] sm:px-6 sm:pt-6">
        <div className="text-center text-red-500 p-8">
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-gray-200 bg-white px-5 pb-5 pt-5 dark:border-gray-800 dark:bg-white/[0.03] sm:px-6 sm:pt-6">
      <div className="flex flex-col gap-5 mb-6 sm:flex-row sm:justify-between">
        <div className="w-full">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
            Activity Overview
          </h3>
          <p className="mt-1 text-gray-500 text-theme-sm dark:text-gray-400">
            Current session statistics
          </p>
        </div>
        <div className="flex items-start w-full gap-3 sm:justify-end">
          <ChartTab />
        </div>
      </div>

      {/* Metrics Summary */}
      {automationData && !isLoading && (
        <div className="grid grid-cols-1 gap-4 mb-6 sm:grid-cols-2">
          <div className="text-center">
            <p className="text-2xl font-bold text-green-500">{automationData.totalMatches}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Total Matches</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-red-500">{automationData.totalNopes}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Total Nopes</p>
          </div>
        </div>
      )}

      <div className="max-w-full overflow-x-auto custom-scrollbar">
        <div className="min-w-[1000px] xl:min-w-full">
          {isLoading ? (
            <div className="flex justify-center items-center h-[310px]">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-500"></div>
            </div>
          ) : historicalData.length > 0 ? (
            <ReactApexChart
              options={options}
              series={series}
              type="area"
              height={310}
            />
          ) : (
            <div className="flex justify-center items-center h-[310px] text-gray-500">
              <p>No data available yet. Data will appear as the system runs.</p>
            </div>
          )}
        </div>
      </div>

      {/* Additional Info */}
      {automationData && !isLoading && (
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="text-center">
            <p className="text-sm text-gray-500 dark:text-gray-400">Success Rate</p>
            <p className="text-lg font-semibold text-gray-800 dark:text-white/90">
              {(automationData.successRate * 100).toFixed(1)}%
            </p>
          </div>
          <div className="text-center">
            <p className="text-sm text-gray-500 dark:text-gray-400">Active Sessions</p>
            <p className="text-lg font-semibold text-gray-800 dark:text-white/90">
              {automationData.activeSessions}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
