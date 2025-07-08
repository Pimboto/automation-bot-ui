// src/components/dashboard/EnhancedDashboard.tsx
"use client";
import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { apiService, AutomationSession, Device, MetricsResponse } from '@/services/api';
import { useMetrics } from '@/hooks/useMetrics';
import { useInterval } from '@/hooks/useInterval';
import dynamic from 'next/dynamic';
import Badge from '../ui/badge/Badge';

// Dynamic imports for charts
const ReactApexChart = dynamic(() => import('react-apexcharts'), { ssr: false });

interface DashboardWidget {
  id: string;
  title: string;
  icon: string;
  size: 'small' | 'medium' | 'large';
  refreshInterval?: number;
}

const EnhancedDashboard: React.FC = () => {
  const { data: metrics, isLoading: metricsLoading, error: metricsError, refetch: refetchMetrics } = useMetrics(30000);
  const [activeSessions, setActiveSessions] = useState<AutomationSession[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [selectedTimeRange, setSelectedTimeRange] = useState<'1h' | '6h' | '24h' | '7d'>('24h');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Fetch active sessions and devices
  const fetchDashboardData = async () => {
    try {
      const [sessionsResponse, devicesResponse] = await Promise.all([
        apiService.getAutomationSessions(),
        apiService.getDevices()
      ]);

      setActiveSessions(sessionsResponse.sessions.filter(s => 
        s.status === 'running' || s.status === 'initializing'
      ));
      setDevices(devicesResponse.devices);
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  useInterval(fetchDashboardData, 10000); // Refresh every 10 seconds

  const handleGlobalRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([
      refetchMetrics(),
      fetchDashboardData()
    ]);
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  // Calculate health score function
  const calculateHealthScore = (metrics: MetricsResponse): number => {
    const { system, automation, device, appium, api } = metrics.metrics;
    
    let score = 100;
    
    // CPU usage penalty
    const cpuUsage = parseFloat(system.cpu.usage);
    if (cpuUsage > 80) score -= 20;
    else if (cpuUsage > 60) score -= 10;
    
    // Memory usage penalty
    const memUsage = parseFloat(system.memory.usedPercent);
    if (memUsage > 90) score -= 20;
    else if (memUsage > 70) score -= 10;
    
    // Error rate penalty
    if (api.errorCount > 0 && api.requestCount > 0) {
      const errorRate = (api.errorCount / api.requestCount) * 100;
      if (errorRate > 10) score -= 20;
      else if (errorRate > 5) score -= 10;
    }
    
    // Success rate bonus
    if (automation.successRate > 0.9) score += 10;
    
    return Math.max(0, Math.min(100, score));
  };

  // Calculate derived metrics
  const derivedMetrics = useMemo(() => {
    if (!metrics) return null;

    const automation = metrics.metrics.automation;
    const device = metrics.metrics.device;
    
    return {
      successRate: automation.successRate * 100,
      utilizationRate: device.total > 0 ? (device.inUse / device.total) * 100 : 0,
      avgSessionDuration: automation.totalSessions > 0 
        ? automation.avgSwipesPerSession / (automation.swipesPerMinute || 1) 
        : 0,
      healthScore: calculateHealthScore(metrics)
    };
  }, [metrics]);

  const getHealthColor = (score: number) => {
    if (score >= 80) return 'text-green-500';
    if (score >= 60) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getHealthEmoji = (score: number) => {
    if (score >= 80) return '😊';
    if (score >= 60) return '😐';
    return '😟';
  };

  // Chart configurations
  const activityChartOptions: ApexOptions = {
    chart: {
      type: 'area',
      height: 250,
      toolbar: { show: false },
      zoom: { enabled: false },
      animations: {
        enabled: true,
        easing: 'easeinout',
        speed: 800
      }
    },
    stroke: {
      curve: 'smooth',
      width: 2
    },
    fill: {
      type: 'gradient',
      gradient: {
        shadeIntensity: 1,
        opacityFrom: 0.7,
        opacityTo: 0.3,
        stops: [0, 100]
      }
    },
    dataLabels: { enabled: false },
    grid: {
      borderColor: '#374151',
      strokeDashArray: 4,
      yaxis: { lines: { show: true } },
      xaxis: { lines: { show: false } }
    },
    xaxis: {
      type: 'datetime',
      labels: { style: { colors: '#9CA3AF' } },
      axisBorder: { show: false },
      axisTicks: { show: false }
    },
    yaxis: {
      labels: { style: { colors: '#9CA3AF' } }
    },
    tooltip: {
      theme: 'dark',
      x: { format: 'dd MMM HH:mm' }
    },
    colors: ['#3B82F6', '#10B981', '#F59E0B', '#EF4444']
  };

  const performanceGaugeOptions: ApexOptions = {
    chart: {
      type: 'radialBar',
      height: 200,
      sparkline: { enabled: true }
    },
    plotOptions: {
      radialBar: {
        startAngle: -135,
        endAngle: 135,
        track: {
          background: '#374151',
          strokeWidth: '97%',
          margin: 5
        },
        hollow: {
          size: '60%'
        },
        dataLabels: {
          name: { show: false },
          value: {
            fontSize: '24px',
            fontWeight: 600,
            color: '#E5E7EB',
            offsetY: 10,
            formatter: (val) => val + '%'
          }
        }
      }
    },
    fill: {
      type: 'gradient',
      gradient: {
        shade: 'dark',
        shadeIntensity: 0.15,
        inverseColors: false,
        opacityFrom: 1,
        opacityTo: 1,
        stops: [0, 50, 65, 91]
      }
    },
    stroke: {
      dashArray: 4
    },
    colors: ['#3B82F6']
  };

  return (
    <div className="space-y-6">
      {/* Header with Global Actions */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">
            Automation Dashboard
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Real-time monitoring and analytics
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <select
            value={selectedTimeRange}
            onChange={(e) => setSelectedTimeRange(e.target.value as any)}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
          >
            <option value="1h">Last Hour</option>
            <option value="6h">Last 6 Hours</option>
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
          </select>
          
          <button
            onClick={handleGlobalRefresh}
            className={`rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 transition-all ${
              isRefreshing ? 'animate-spin' : ''
            }`}
          >
            {isRefreshing ? '🔄' : '🔄'} Refresh All
          </button>
        </div>
      </div>

      {/* Quick Stats Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Active Sessions
              </p>
              <p className="text-3xl font-bold text-gray-800 dark:text-white mt-1">
                {activeSessions.length}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                {metrics?.metrics.automation.totalSessions || 0} total today
              </p>
            </div>
            <div className="text-4xl">🚀</div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Available Devices
              </p>
              <p className="text-3xl font-bold text-gray-800 dark:text-white mt-1">
                {metrics?.metrics.device.available || 0}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                of {metrics?.metrics.device.total || 0} total
              </p>
            </div>
            <div className="text-4xl">📱</div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
          className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Success Rate
              </p>
              <p className="text-3xl font-bold text-green-600 dark:text-green-400 mt-1">
                {derivedMetrics?.successRate.toFixed(1) || 0}%
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                {metrics?.metrics.automation.completedSessions || 0} completed
              </p>
            </div>
            <div className="text-4xl">✅</div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.3 }}
          className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Health Score
              </p>
              <p className={`text-3xl font-bold mt-1 ${
                derivedMetrics ? getHealthColor(derivedMetrics.healthScore) : 'text-gray-500'
              }`}>
                {derivedMetrics?.healthScore || 0}%
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                System health
              </p>
            </div>
            <div className="text-4xl">
              {derivedMetrics ? getHealthEmoji(derivedMetrics.healthScore) : '🤔'}
            </div>
          </div>
        </motion.div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Activity Chart - 2 columns */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3, delay: 0.4 }}
          className="lg:col-span-2 rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white">
              Automation Activity
            </h3>
            <div className="flex gap-2">
              {['Swipes', 'Matches', 'Errors'].map((label, i) => (
                <div key={label} className="flex items-center gap-1">
                  <div className={`w-3 h-3 rounded-full ${
                    i === 0 ? 'bg-blue-500' : i === 1 ? 'bg-green-500' : 'bg-red-500'
                  }`} />
                  <span className="text-xs text-gray-500 dark:text-gray-400">{label}</span>
                </div>
              ))}
            </div>
          </div>
          
          {metricsLoading ? (
            <div className="h-[250px] flex items-center justify-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-500"></div>
            </div>
          ) : (
            <ReactApexChart
              options={activityChartOptions}
              series={[
                {
                  name: 'Swipes',
                  data: generateMockTimeSeriesData(24, 100, 500)
                },
                {
                  name: 'Matches',
                  data: generateMockTimeSeriesData(24, 10, 50)
                },
                {
                  name: 'Errors',
                  data: generateMockTimeSeriesData(24, 0, 10)
                }
              ]}
              type="area"
              height={250}
            />
          )}
        </motion.div>

        {/* Performance Gauge - 1 column */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3, delay: 0.5 }}
          className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900"
        >
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">
            Performance
          </h3>
          
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-500 dark:text-gray-400">CPU Usage</span>
                <span className="font-medium text-gray-800 dark:text-white">
                  {metrics?.metrics.system.cpu.usage || '0'}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2 dark:bg-gray-700">
                <div 
                  className="bg-blue-500 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${metrics?.metrics.system.cpu.usage || 0}%` }}
                />
              </div>
            </div>
            
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-500 dark:text-gray-400">Memory Usage</span>
                <span className="font-medium text-gray-800 dark:text-white">
                  {metrics?.metrics.system.memory.usedPercent || '0'}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2 dark:bg-gray-700">
                <div 
                  className="bg-green-500 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${metrics?.metrics.system.memory.usedPercent || 0}%` }}
                />
              </div>
            </div>
            
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-500 dark:text-gray-400">Device Utilization</span>
                <span className="font-medium text-gray-800 dark:text-white">
                  {derivedMetrics?.utilizationRate.toFixed(1) || 0}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2 dark:bg-gray-700">
                <div 
                  className="bg-purple-500 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${derivedMetrics?.utilizationRate || 0}%` }}
                />
              </div>
            </div>
            
            <div className="pt-4">
              <ReactApexChart
                options={performanceGaugeOptions}
                series={[derivedMetrics?.healthScore || 0]}
                type="radialBar"
                height={200}
              />
            </div>
          </div>
        </motion.div>
      </div>

      {/* Active Sessions List */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.6 }}
        className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white">
            Active Sessions
          </h3>
          <a href="/sessions" className="text-sm text-brand-500 hover:text-brand-600">
            View All →
          </a>
        </div>
        
        {activeSessions.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <p className="text-2xl mb-2">🌟</p>
            <p>No active sessions at the moment</p>
          </div>
        ) : (
          <div className="space-y-3">
            {activeSessions.slice(0, 5).map((session) => (
              <motion.div
                key={session.id}
                whileHover={{ scale: 1.02 }}
                className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse" />
                  <div>
                    <p className="font-medium text-gray-800 dark:text-white">
                      {session.flow} on {session.deviceInfo?.name}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {session.checkpoint} • Run {session.runCount}/{session.maxRuns}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge size="sm" color="success">
                    {session.status}
                  </Badge>
                  <a
                    href={`/sessions/${session.id}`}
                    className="text-sm text-brand-500 hover:text-brand-600"
                  >
                    View Logs →
                  </a>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>

      {/* Recent Events */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.7 }}
        className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900"
      >
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">
          Recent Events
        </h3>
        
        <div className="space-y-3">
          <AnimatePresence>
            {generateMockEvents().map((event, index) => (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.2, delay: index * 0.05 }}
                className="flex items-start gap-3"
              >
                <div className={`mt-0.5 w-2 h-2 rounded-full ${
                  event.type === 'success' ? 'bg-green-500' :
                  event.type === 'error' ? 'bg-red-500' :
                  event.type === 'warning' ? 'bg-yellow-500' :
                  'bg-blue-500'
                }`} />
                <div className="flex-1">
                  <p className="text-sm text-gray-800 dark:text-white">
                    {event.message}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    {event.time} • {event.device}
                  </p>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
};

// Helper functions
function generateMockTimeSeriesData(hours: number, min: number, max: number) {
  const data = [];
  const now = Date.now();
  for (let i = hours; i >= 0; i--) {
    data.push({
      x: now - (i * 60 * 60 * 1000),
      y: Math.floor(Math.random() * (max - min + 1)) + min
    });
  }
  return data;
}

function generateMockEvents() {
  const events = [
    { id: '1', type: 'success', message: 'Session 7a5a55ae completed successfully', device: 'Negro 1', time: '2 min ago' },
    { id: '2', type: 'info', message: 'New device connected: Frank Negro 1', device: 'System', time: '5 min ago' },
    { id: '3', type: 'warning', message: 'High memory usage detected (85%)', device: 'Server', time: '10 min ago' },
    { id: '4', type: 'error', message: 'Failed to start session on Azul', device: 'Azul', time: '15 min ago' },
    { id: '5', type: 'success', message: 'Profile generated for session 8b6b66bf', device: 'Negro 2', time: '20 min ago' }
  ];
  return events;
}

export default EnhancedDashboard;
