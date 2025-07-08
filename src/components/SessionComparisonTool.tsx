// src/components/automation/SessionComparisonTool.tsx
"use client";
import React, { useState, useEffect, useMemo } from 'react';
import { apiService, AutomationSession, AutomationLog } from '@/services/api';
import { motion, AnimatePresence } from 'framer-motion';
import Badge from '../ui/badge/Badge';
import Button from '../ui/button/Button';
import { Modal } from '../ui/modal';
import { useModal } from '@/hooks/useModal';
import dynamic from 'next/dynamic';

const ReactApexChart = dynamic(() => import('react-apexcharts'), { ssr: false });

interface SessionData {
  session: AutomationSession;
  logs: AutomationLog[];
  metrics: SessionMetrics;
}

interface SessionMetrics {
  totalLogs: number;
  errorCount: number;
  warningCount: number;
  duration: number;
  checkpointsCompleted: number;
  avgTimePerCheckpoint: number;
  errorRate: number;
  timeline: TimelineEvent[];
}

interface TimelineEvent {
  timestamp: string;
  checkpoint: string;
  status: 'completed' | 'error' | 'running';
  duration?: number;
}

interface ComparisonMetric {
  label: string;
  key: keyof SessionMetrics;
  format: (value: any) => string;
  betterWhen: 'higher' | 'lower';
}

const comparisonMetrics: ComparisonMetric[] = [
  { label: 'Total Logs', key: 'totalLogs', format: (v) => v.toString(), betterWhen: 'lower' },
  { label: 'Errors', key: 'errorCount', format: (v) => v.toString(), betterWhen: 'lower' },
  { label: 'Warnings', key: 'warningCount', format: (v) => v.toString(), betterWhen: 'lower' },
  { label: 'Duration', key: 'duration', format: (v) => `${(v / 60).toFixed(1)}m`, betterWhen: 'lower' },
  { label: 'Checkpoints', key: 'checkpointsCompleted', format: (v) => v.toString(), betterWhen: 'higher' },
  { label: 'Error Rate', key: 'errorRate', format: (v) => `${(v * 100).toFixed(1)}%`, betterWhen: 'lower' },
];

const SessionComparisonTool: React.FC = () => {
  const [sessions, setSessions] = useState<Map<string, SessionData>>(new Map());
  const [availableSessions, setAvailableSessions] = useState<AutomationSession[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [comparisonMode, setComparisonMode] = useState<'metrics' | 'timeline' | 'logs'>('metrics');
  const addSessionModal = useModal();

  // Fetch available sessions
  useEffect(() => {
    fetchAvailableSessions();
  }, []);

  const fetchAvailableSessions = async () => {
    try {
      const response = await apiService.getAutomationSessions();
      setAvailableSessions(response.sessions);
    } catch (err) {
      console.error('Error fetching sessions:', err);
    }
  };

  const addSessionToCompare = async (session: AutomationSession) => {
    if (sessions.has(session.id)) return;
    
    setIsLoading(true);
    try {
      const logs = await apiService.getAutomationLogs(session.id, 1000);
      const metrics = calculateMetrics(session, logs.logs);
      
      setSessions(prev => {
        const updated = new Map(prev);
        updated.set(session.id, {
          session,
          logs: logs.logs,
          metrics
        });
        return updated;
      });
    } catch (err) {
      console.error('Error loading session data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const removeSession = (sessionId: string) => {
    setSessions(prev => {
      const updated = new Map(prev);
      updated.delete(sessionId);
      return updated;
    });
  };

  const calculateMetrics = (session: AutomationSession, logs: AutomationLog[]): SessionMetrics => {
    const errorCount = logs.filter(log => log.level === 'error').length;
    const warningCount = logs.filter(log => log.level === 'warn').length;
    
    // Calculate duration
    const startTime = session.startTime ? new Date(session.startTime).getTime() : 0;
    const endTime = session.endTime ? new Date(session.endTime).getTime() : Date.now();
    const duration = (endTime - startTime) / 1000; // in seconds
    
    // Extract timeline from logs
    const timeline: TimelineEvent[] = [];
    const checkpointRegex = /checkpoint[:\s]+(\w+)/i;
    let currentCheckpoint = session.checkpoint;
    
    logs.forEach((log, index) => {
      const match = log.message.match(checkpointRegex);
      if (match && match[1] !== currentCheckpoint) {
        timeline.push({
          timestamp: log.timestamp,
          checkpoint: match[1],
          status: 'completed'
        });
        currentCheckpoint = match[1];
      }
    });
    
    return {
      totalLogs: logs.length,
      errorCount,
      warningCount,
      duration,
      checkpointsCompleted: timeline.length,
      avgTimePerCheckpoint: timeline.length > 0 ? duration / timeline.length : 0,
      errorRate: logs.length > 0 ? errorCount / logs.length : 0,
      timeline
    };
  };

  // Calculate best/worst for each metric
  const metricAnalysis = useMemo(() => {
    const analysis: Record<string, { best: string; worst: string }> = {};
    
    comparisonMetrics.forEach(metric => {
      let bestValue: number | null = null;
      let worstValue: number | null = null;
      let bestId = '';
      let worstId = '';
      
      sessions.forEach((data, id) => {
        const value = data.metrics[metric.key] as number;
        
        if (bestValue === null || 
            (metric.betterWhen === 'higher' ? value > bestValue : value < bestValue)) {
          bestValue = value;
          bestId = id;
        }
        
        if (worstValue === null || 
            (metric.betterWhen === 'higher' ? value < worstValue : value > worstValue)) {
          worstValue = value;
          worstId = id;
        }
      });
      
      analysis[metric.key] = { best: bestId, worst: worstId };
    });
    
    return analysis;
  }, [sessions]);

  // Prepare chart data
  const chartData = useMemo(() => {
    const categories = Array.from(sessions.values()).map(data => 
      data.session.deviceInfo?.name || data.session.id.substring(0, 8)
    );
    
    const series = [
      {
        name: 'Errors',
        data: Array.from(sessions.values()).map(data => data.metrics.errorCount)
      },
      {
        name: 'Warnings',
        data: Array.from(sessions.values()).map(data => data.metrics.warningCount)
      },
      {
        name: 'Checkpoints',
        data: Array.from(sessions.values()).map(data => data.metrics.checkpointsCompleted)
      }
    ];
    
    return { categories, series };
  }, [sessions]);

  const chartOptions: ApexOptions = {
    chart: {
      type: 'bar',
      height: 350,
      toolbar: { show: false }
    },
    plotOptions: {
      bar: {
        horizontal: false,
        columnWidth: '55%',
        endingShape: 'rounded'
      }
    },
    dataLabels: { enabled: false },
    stroke: {
      show: true,
      width: 2,
      colors: ['transparent']
    },
    xaxis: {
      categories: chartData.categories,
      labels: { style: { colors: '#9CA3AF' } }
    },
    yaxis: {
      title: { text: 'Count', style: { color: '#9CA3AF' } },
      labels: { style: { colors: '#9CA3AF' } }
    },
    fill: { opacity: 1 },
    tooltip: {
      theme: 'dark',
      y: {
        formatter: function (val) {
          return val + " occurrences";
        }
      }
    },
    colors: ['#EF4444', '#F59E0B', '#10B981'],
    legend: {
      position: 'top',
      labels: { colors: '#9CA3AF' }
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-gray-800 dark:text-white/90 flex items-center gap-3">
              <span className="text-3xl">⚖️</span>
              Session Comparison Tool
            </h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Compare performance metrics across multiple automation sessions
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <Button
              size="sm"
              onClick={addSessionModal.openModal}
              disabled={sessions.size >= 5}
            >
              ➕ Add Session
            </Button>
          </div>
        </div>
      </div>

      {/* Comparison Mode Selector */}
      {sessions.size > 0 && (
        <div className="flex gap-2 p-1 bg-gray-100 rounded-lg dark:bg-gray-800 w-fit">
          {(['metrics', 'timeline', 'logs'] as const).map(mode => (
            <button
              key={mode}
              onClick={() => setComparisonMode(mode)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                comparisonMode === mode
                  ? 'bg-white text-brand-500 shadow-sm dark:bg-gray-700'
                  : 'text-gray-600 hover:text-gray-800 dark:text-gray-400'
              }`}
            >
              {mode.charAt(0).toUpperCase() + mode.slice(1)}
            </button>
          ))}
        </div>
      )}

      {/* Main Content */}
      {sessions.size === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-gray-300 bg-gray-50 p-12 text-center dark:border-gray-700 dark:bg-gray-900">
          <div className="text-5xl mb-4">📊</div>
          <h3 className="text-lg font-medium text-gray-800 dark:text-white mb-2">
            No Sessions to Compare
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            Add sessions to start comparing their performance metrics
          </p>
          <Button onClick={addSessionModal.openModal}>
            Add First Session
          </Button>
        </div>
      ) : (
        <>
          {/* Session Cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {Array.from(sessions.entries()).map(([id, data]) => (
              <motion.div
                key={id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="relative rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900"
              >
                <button
                  onClick={() => removeSession(id)}
                  className="absolute top-2 right-2 text-gray-400 hover:text-red-500"
                >
                  ✕
                </button>
                
                <div className="mb-3">
                  <h4 className="font-medium text-gray-800 dark:text-white">
                    {data.session.deviceInfo?.name || 'Unknown'}
                  </h4>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {id.substring(0, 8)}...
                  </p>
                </div>
                
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Flow:</span>
                    <span className="font-medium">{data.session.flow}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Status:</span>
                    <Badge size="sm" color={
                      data.session.status === 'completed' ? 'success' :
                      data.session.status === 'error' ? 'error' :
                      'warning'
                    }>
                      {data.session.status}
                    </Badge>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Comparison Views */}
          <AnimatePresence mode="wait">
            {comparisonMode === 'metrics' && (
              <motion.div
                key="metrics"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-6"
              >
                {/* Metrics Table */}
                <div className="rounded-xl border border-gray-200 bg-white overflow-hidden dark:border-gray-800 dark:bg-gray-900">
                  <table className="w-full">
                    <thead className="bg-gray-50 dark:bg-gray-800">
                      <tr>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-300">
                          Metric
                        </th>
                        {Array.from(sessions.entries()).map(([id, data]) => (
                          <th key={id} className="px-4 py-3 text-center text-sm font-medium text-gray-700 dark:text-gray-300">
                            {data.session.deviceInfo?.name || id.substring(0, 8)}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                      {comparisonMetrics.map(metric => (
                        <tr key={metric.key}>
                          <td className="px-4 py-3 text-sm font-medium text-gray-700 dark:text-gray-300">
                            {metric.label}
                          </td>
                          {Array.from(sessions.entries()).map(([id, data]) => {
                            const value = data.metrics[metric.key];
                            const isBest = metricAnalysis[metric.key]?.best === id;
                            const isWorst = metricAnalysis[metric.key]?.worst === id;
                            
                            return (
                              <td
                                key={id}
                                className={`px-4 py-3 text-center text-sm ${
                                  isBest ? 'bg-green-50 text-green-700 font-semibold dark:bg-green-900/20 dark:text-green-400' :
                                  isWorst ? 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400' :
                                  'text-gray-700 dark:text-gray-300'
                                }`}
                              >
                                {metric.format(value)}
                                {isBest && <span className="ml-1">✨</span>}
                                {isWorst && <span className="ml-1">⚠️</span>}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Comparison Chart */}
                <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
                  <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">
                    Visual Comparison
                  </h3>
                  <ReactApexChart
                    options={chartOptions}
                    series={chartData.series}
                    type="bar"
                    height={350}
                  />
                </div>
              </motion.div>
            )}

            {comparisonMode === 'timeline' && (
              <motion.div
                key="timeline"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900"
              >
                <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">
                  Session Timelines
                </h3>
                
                <div className="space-y-6">
                  {Array.from(sessions.entries()).map(([id, data]) => (
                    <div key={id} className="space-y-2">
                      <h4 className="font-medium text-gray-700 dark:text-gray-300">
                        {data.session.deviceInfo?.name || id.substring(0, 8)}
                      </h4>
                      
                      <div className="relative">
                        <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-300 dark:bg-gray-700" />
                        
                        {data.metrics.timeline.length === 0 ? (
                          <div className="pl-10 py-2 text-sm text-gray-500 dark:text-gray-400">
                            No checkpoint data available
                          </div>
                        ) : (
                          data.metrics.timeline.map((event, index) => (
                            <div key={index} className="relative flex items-center py-2">
                              <div className={`absolute left-2 w-4 h-4 rounded-full ${
                                event.status === 'completed' ? 'bg-green-500' :
                                event.status === 'error' ? 'bg-red-500' :
                                'bg-yellow-500'
                              }`} />
                              
                              <div className="pl-10">
                                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                  {event.checkpoint}
                                </p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                  {new Date(event.timestamp).toLocaleTimeString()}
                                </p>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {comparisonMode === 'logs' && (
              <motion.div
                key="logs"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900"
              >
                <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">
                  Log Analysis
                </h3>
                
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                  {Array.from(sessions.entries()).map(([id, data]) => {
                    const errorLogs = data.logs.filter(log => log.level === 'error');
                    const warningLogs = data.logs.filter(log => log.level === 'warn');
                    
                    return (
                      <div key={id} className="space-y-3">
                        <h4 className="font-medium text-gray-700 dark:text-gray-300">
                          {data.session.deviceInfo?.name || id.substring(0, 8)}
                        </h4>
                        
                        {errorLogs.length > 0 && (
                          <div className="space-y-2">
                            <h5 className="text-sm font-medium text-red-600 dark:text-red-400">
                              Recent Errors ({errorLogs.length})
                            </h5>
                            <div className="space-y-1 max-h-32 overflow-y-auto">
                              {errorLogs.slice(0, 5).map((log, index) => (
                                <div key={index} className="text-xs bg-red-50 dark:bg-red-900/20 p-2 rounded">
                                  <span className="text-gray-500 dark:text-gray-400">
                                    {new Date(log.timestamp).toLocaleTimeString()}
                                  </span>
                                  <span className="ml-2 text-red-700 dark:text-red-300">
                                    {log.message}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {warningLogs.length > 0 && (
                          <div className="space-y-2">
                            <h5 className="text-sm font-medium text-yellow-600 dark:text-yellow-400">
                              Recent Warnings ({warningLogs.length})
                            </h5>
                            <div className="space-y-1 max-h-32 overflow-y-auto">
                              {warningLogs.slice(0, 3).map((log, index) => (
                                <div key={index} className="text-xs bg-yellow-50 dark:bg-yellow-900/20 p-2 rounded">
                                  <span className="text-gray-500 dark:text-gray-400">
                                    {new Date(log.timestamp).toLocaleTimeString()}
                                  </span>
                                  <span className="ml-2 text-yellow-700 dark:text-yellow-300">
                                    {log.message}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {errorLogs.length === 0 && warningLogs.length === 0 && (
                          <p className="text-sm text-green-600 dark:text-green-400">
                            ✅ No errors or warnings
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Summary */}
          {sessions.size > 1 && (
            <div className="rounded-xl border border-gray-200 bg-gradient-to-r from-brand-50 to-purple-50 p-6 dark:border-gray-800 dark:from-brand-900/20 dark:to-purple-900/20">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">
                📊 Comparison Summary
              </h3>
              
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Best Overall Performance</p>
                  <p className="text-lg font-semibold text-gray-800 dark:text-white">
                    {(() => {
                      let bestId = '';
                      let bestScore = -1;
                      
                      sessions.forEach((data, id) => {
                        let score = 0;
                        Object.keys(metricAnalysis).forEach(key => {
                          if (metricAnalysis[key].best === id) score++;
                        });
                        if (score > bestScore) {
                          bestScore = score;
                          bestId = id;
                        }
                      });
                      
                      return sessions.get(bestId)?.session.deviceInfo?.name || 'N/A';
                    })()}
                  </p>
                </div>
                
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Average Error Rate</p>
                  <p className="text-lg font-semibold text-gray-800 dark:text-white">
                    {(() => {
                      const rates = Array.from(sessions.values()).map(d => d.metrics.errorRate);
                      const avg = rates.reduce((a, b) => a + b, 0) / rates.length;
                      return `${(avg * 100).toFixed(1)}%`;
                    })()}
                  </p>
                </div>
                
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Sessions Compared</p>
                  <p className="text-lg font-semibold text-gray-800 dark:text-white">
                    {sessions.size} sessions
                  </p>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Add Session Modal */}
      <Modal
        isOpen={addSessionModal.isOpen}
        onClose={addSessionModal.closeModal}
        className="max-w-2xl p-6"
      >
        <h3 className="text-lg font-medium text-gray-800 dark:text-white/90 mb-4">
          Select Session to Compare
        </h3>

        <div className="space-y-3 max-h-96 overflow-y-auto">
          {availableSessions
            .filter(s => !sessions.has(s.id))
            .map(session => (
              <div
                key={session.id}
                onClick={() => {
                  addSessionToCompare(session);
                  addSessionModal.closeModal();
                }}
                className="flex items-center justify-between p-4 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer transition-colors dark:border-gray-700 dark:hover:bg-gray-800"
              >
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <h4 className="font-medium text-gray-800 dark:text-white/90">
                      {session.deviceInfo?.name || 'Unknown Device'}
                    </h4>
                    <Badge size="sm" color={
                      session.status === 'completed' ? 'success' :
                      session.status === 'error' ? 'error' :
                      'warning'
                    }>
                      {session.status}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                    <span>Flow: {session.flow}</span>
                    <span>•</span>
                    <span>ID: {session.id.substring(0, 8)}</span>
                    <span>•</span>
                    <span>Started: {session.startTime ? new Date(session.startTime).toLocaleString() : 'N/A'}</span>
                  </div>
                </div>
                <div className="text-2xl">➕</div>
              </div>
            ))}
        </div>

        {availableSessions.filter(s => !sessions.has(s.id)).length === 0 && (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <p>No more sessions available to compare</p>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default SessionComparisonTool;
