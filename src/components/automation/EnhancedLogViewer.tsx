// src/components/automation/EnhancedLogViewer.tsx
"use client";
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { apiService, AutomationLog, AutomationSession, getAutomationStatusColor } from '@/services/api';
import Badge from '../ui/badge/Badge';
import Button from '../ui/button/Button';
import { useInterval } from '@/hooks/useInterval';
import { motion, AnimatePresence } from 'framer-motion';

interface EnhancedLogViewerProps {
  sessionId: string;
  autoRefresh?: boolean;
  refreshInterval?: number;
  embedded?: boolean;
}

type LogLevel = 'all' | 'info' | 'warn' | 'error' | 'debug';
type ExportFormat = 'txt' | 'json' | 'csv' | 'html';

interface LogFilter {
  level: LogLevel;
  searchTerm: string;
  dateFrom?: Date;
  dateTo?: Date;
  regex?: string;
  caseSensitive: boolean;
}

interface LogStats {
  total: number;
  byLevel: Record<string, number>;
  errorRate: number;
  avgLogsPerMinute: number;
}

const EnhancedLogViewer: React.FC<EnhancedLogViewerProps> = ({ 
  sessionId, 
  autoRefresh = true,
  refreshInterval = 2000,
  embedded = false
}) => {
  const [logs, setLogs] = useState<AutomationLog[]>([]);
  const [session, setSession] = useState<AutomationSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const [showStats, setShowStats] = useState(false);
  const [selectedLogs, setSelectedLogs] = useState<Set<number>>(new Set());
  const [isCompactView, setIsCompactView] = useState(false);

  // Filter state
  const [filter, setFilter] = useState<LogFilter>({
    level: 'all',
    searchTerm: '',
    caseSensitive: false
  });

  // Advanced filter visibility
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  const logsEndRef = useRef<HTMLDivElement>(null);
  const logsContainerRef = useRef<HTMLDivElement>(null);

  // Fetch session and logs
  const fetchData = useCallback(async () => {
    if (isPaused) return;

    try {
      setError(null);
      const [statusResponse, logsResponse] = await Promise.all([
        apiService.getAutomationStatus(sessionId),
        apiService.getAutomationLogs(sessionId, 500) // Fetch more logs
      ]);
      
      setSession(statusResponse.session);
      setLogs(logsResponse.logs);
      
    } catch (err) {
      console.error('Error fetching logs:', err);
      setError('Failed to load logs');
    } finally {
      setIsLoading(false);
    }
  }, [sessionId, isPaused]);

  // Initial load
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Auto-refresh
  useInterval(() => {
    if (autoRefresh && !isPaused && session?.status === 'running') {
      fetchData();
    }
  }, refreshInterval);

  // Auto-scroll
  useEffect(() => {
    if (autoScroll && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, autoScroll]);

  // Filter logs
  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      // Level filter
      if (filter.level !== 'all' && log.level !== filter.level) return false;

      // Search term filter
      if (filter.searchTerm) {
        const searchIn = `${log.message} ${JSON.stringify(log.data)}`;
        if (filter.caseSensitive) {
          if (!searchIn.includes(filter.searchTerm)) return false;
        } else {
          if (!searchIn.toLowerCase().includes(filter.searchTerm.toLowerCase())) return false;
        }
      }

      // Date range filter
      if (filter.dateFrom && new Date(log.timestamp) < filter.dateFrom) return false;
      if (filter.dateTo && new Date(log.timestamp) > filter.dateTo) return false;

      // Regex filter
      if (filter.regex) {
        try {
          const regex = new RegExp(filter.regex, filter.caseSensitive ? 'g' : 'gi');
          if (!regex.test(log.message)) return false;
        } catch (e) {
          // Invalid regex
        }
      }

      return true;
    });
  }, [logs, filter]);

  // Calculate statistics
  const stats: LogStats = useMemo(() => {
    const byLevel = filteredLogs.reduce((acc, log) => {
      acc[log.level] = (acc[log.level] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const errorCount = byLevel['error'] || 0;
    const errorRate = filteredLogs.length > 0 ? (errorCount / filteredLogs.length) * 100 : 0;

    // Calculate logs per minute
    let avgLogsPerMinute = 0;
    if (filteredLogs.length > 1) {
      const firstTime = new Date(filteredLogs[0].timestamp).getTime();
      const lastTime = new Date(filteredLogs[filteredLogs.length - 1].timestamp).getTime();
      const durationMinutes = (lastTime - firstTime) / 60000;
      avgLogsPerMinute = durationMinutes > 0 ? filteredLogs.length / durationMinutes : 0;
    }

    return {
      total: filteredLogs.length,
      byLevel,
      errorRate,
      avgLogsPerMinute
    };
  }, [filteredLogs]);

  // Export functions
  const exportLogs = (format: ExportFormat) => {
    const logsToExport = selectedLogs.size > 0 
      ? filteredLogs.filter((_, index) => selectedLogs.has(index))
      : filteredLogs;

    let content = '';
    let mimeType = 'text/plain';
    let extension = 'txt';

    switch (format) {
      case 'txt':
        content = logsToExport.map(log => 
          `[${log.timestamp}] [${log.level.toUpperCase()}] ${log.message} ${JSON.stringify(log.data)}`
        ).join('\n');
        break;

      case 'json':
        content = JSON.stringify({
          session: {
            id: sessionId,
            device: session?.deviceInfo?.name,
            flow: session?.flow,
            status: session?.status
          },
          exportDate: new Date().toISOString(),
          logsCount: logsToExport.length,
          logs: logsToExport
        }, null, 2);
        mimeType = 'application/json';
        extension = 'json';
        break;

      case 'csv':
        const csvHeader = 'Timestamp,Level,Message,Data\n';
        const csvContent = logsToExport.map(log => 
          `"${log.timestamp}","${log.level}","${log.message.replace(/"/g, '""')}","${JSON.stringify(log.data).replace(/"/g, '""')}"`
        ).join('\n');
        content = csvHeader + csvContent;
        mimeType = 'text/csv';
        extension = 'csv';
        break;

      case 'html':
        content = `
<!DOCTYPE html>
<html>
<head>
  <title>Logs - Session ${sessionId}</title>
  <style>
    body { font-family: monospace; background: #1a1a1a; color: #e0e0e0; padding: 20px; }
    .log { margin: 5px 0; padding: 5px; border-radius: 3px; }
    .info { background: #1e40af20; color: #93bbfc; }
    .warn { background: #a1620720; color: #fde047; }
    .error { background: #991b1b20; color: #fca5a5; }
    .debug { background: #37415120; color: #d1d5db; }
    .time { color: #6b7280; }
    .meta { background: #262626; padding: 10px; margin-bottom: 20px; border-radius: 5px; }
  </style>
</head>
<body>
  <div class="meta">
    <h2>Session Logs Export</h2>
    <p>Session ID: ${sessionId}</p>
    <p>Device: ${session?.deviceInfo?.name || 'Unknown'}</p>
    <p>Flow: ${session?.flow}</p>
    <p>Exported: ${new Date().toLocaleString()}</p>
    <p>Total Logs: ${logsToExport.length}</p>
  </div>
  ${logsToExport.map(log => `
    <div class="log ${log.level}">
      <span class="time">${log.timestamp}</span>
      [${log.level.toUpperCase()}] ${log.message}
      ${Object.keys(log.data).length > 0 ? `<small>${JSON.stringify(log.data)}</small>` : ''}
    </div>
  `).join('')}
</body>
</html>`;
        mimeType = 'text/html';
        extension = 'html';
        break;
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `logs-${sessionId.split('-')[0]}-${new Date().toISOString().split('T')[0]}.${extension}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Ctrl/Cmd + F: Focus search
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        document.getElementById('log-search')?.focus();
      }
      // Ctrl/Cmd + A: Select all (when focused on logs)
      if ((e.ctrlKey || e.metaKey) && e.key === 'a' && logsContainerRef.current?.contains(document.activeElement)) {
        e.preventDefault();
        setSelectedLogs(new Set(filteredLogs.map((_, i) => i)));
      }
      // Escape: Clear selection
      if (e.key === 'Escape') {
        setSelectedLogs(new Set());
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [filteredLogs]);

  const formatLogTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      fractionalSecondDigits: 3
    });
  };

  const getLogLevelBadgeColor = (level: string) => {
    switch (level) {
      case 'info': return 'info';
      case 'warn': return 'warning';
      case 'error': return 'error';
      case 'debug': return 'light';
      default: return 'light';
    }
  };

  const highlightText = (text: string) => {
    if (!filter.searchTerm) return text;

    const regex = new RegExp(`(${filter.searchTerm})`, filter.caseSensitive ? 'g' : 'gi');
    const parts = text.split(regex);

    return parts.map((part, i) => 
      regex.test(part) ? <mark key={i} className="bg-yellow-300 dark:bg-yellow-600 text-black dark:text-white px-0.5">{part}</mark> : part
    );
  };

  if (error && !logs.length) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
        <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${embedded ? '' : 'max-w-full'}`}>
      {/* Session Header */}
      {!embedded && session && (
        <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div>
                <h4 className="text-sm font-medium text-gray-800 dark:text-white/90">
                  Session: {sessionId.split('-')[0]}...
                </h4>
                <div className="mt-1 flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                  <span>📱 {session.device?.name ?? 'Unknown Device'}</span>
                  <span>🔄 {session.flow}</span>
                  <span>📍 {session.checkpoint}</span>
                  {session.runCount !== undefined && (
                    <span>🔢 Run {session.runCount}/{session.maxRuns}</span>
                  )}
                </div>
              </div>
              <Badge color={getAutomationStatusColor(session.status)}>
                {session.status}
              </Badge>
            </div>
            {session.status === 'running' && (
              <Button
                size="sm"
                variant="outline"
                onClick={async () => {
                  if (confirm('Are you sure you want to stop this automation?')) {
                    try {
                      await apiService.stopAutomation(sessionId);
                      await fetchData();
                    } catch (err) {
                      console.error('Error stopping session:', err);
                    }
                  }
                }}
                className="bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400"
              >
                ⏹️ Stop Session
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Controls Bar */}
      <div className="rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-800 dark:bg-gray-800">
        <div className="flex flex-col gap-3">
          {/* Main Controls */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              {/* Search */}
              <div className="relative flex-1 sm:w-64">
                <input
                  id="log-search"
                  type="text"
                  placeholder="Search logs... (Ctrl+F)"
                  value={filter.searchTerm}
                  onChange={(e) => setFilter(prev => ({ ...prev, searchTerm: e.target.value }))}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 pl-8 text-sm dark:border-gray-700 dark:bg-gray-900"
                />
                <svg className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>

              {/* Level Filter */}
              <select
                value={filter.level}
                onChange={(e) => setFilter(prev => ({ ...prev, level: e.target.value as LogLevel }))}
                className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
              >
                <option value="all">All Levels</option>
                <option value="info">Info</option>
                <option value="warn">Warnings</option>
                <option value="error">Errors</option>
                <option value="debug">Debug</option>
              </select>

              {/* View Toggle */}
              <button
                onClick={() => setIsCompactView(!isCompactView)}
                className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400 dark:hover:bg-gray-800"
                title={isCompactView ? 'Expanded View' : 'Compact View'}
              >
                {isCompactView ? '📃' : '📄'}
              </button>

              {/* Advanced Filters Toggle */}
              <button
                onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400 dark:hover:bg-gray-800"
              >
                🔧 Advanced
              </button>
            </div>

            <div className="flex items-center gap-2">
              {/* Stats Toggle */}
              <button
                onClick={() => setShowStats(!showStats)}
                className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400 dark:hover:bg-gray-800"
              >
                📊 Stats
              </button>

              {/* Auto Scroll */}
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={autoScroll}
                  onChange={(e) => setAutoScroll(e.target.checked)}
                  className="rounded border-gray-300 text-brand-500 focus:ring-brand-500"
                />
                Auto-scroll
              </label>

              {/* Pause/Resume */}
              <button
                onClick={() => setIsPaused(!isPaused)}
                className="inline-flex items-center gap-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400 dark:hover:bg-gray-800"
              >
                {isPaused ? '▶️ Resume' : '⏸️ Pause'}
              </button>

              {/* Refresh */}
              <button
                onClick={fetchData}
                disabled={isLoading}
                className="inline-flex items-center gap-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400 dark:hover:bg-gray-800"
              >
                🔄 Refresh
              </button>

              {/* Export Dropdown */}
              <div className="relative group">
                <button className="inline-flex items-center gap-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400 dark:hover:bg-gray-800">
                  💾 Export
                </button>
                <div className="absolute right-0 mt-1 hidden w-32 rounded-lg border border-gray-200 bg-white py-1 shadow-lg group-hover:block dark:border-gray-700 dark:bg-gray-800">
                  <button onClick={() => exportLogs('txt')} className="block w-full px-3 py-1.5 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700">Text (.txt)</button>
                  <button onClick={() => exportLogs('json')} className="block w-full px-3 py-1.5 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700">JSON (.json)</button>
                  <button onClick={() => exportLogs('csv')} className="block w-full px-3 py-1.5 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700">CSV (.csv)</button>
                  <button onClick={() => exportLogs('html')} className="block w-full px-3 py-1.5 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700">HTML (.html)</button>
                </div>
              </div>

              {/* Clear Logs */}
              <button
                onClick={() => setLogs([])}
                className="inline-flex items-center gap-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400 dark:hover:bg-gray-800"
              >
                🗑️ Clear
              </button>
            </div>
          </div>

          {/* Advanced Filters */}
          <AnimatePresence>
            {showAdvancedFilters && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="border-t border-gray-200 pt-3 dark:border-gray-700">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <div>
                      <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Regex Pattern</label>
                      <input
                        type="text"
                        placeholder="e.g., error.*checkpoint"
                        value={filter.regex || ''}
                        onChange={(e) => setFilter(prev => ({ ...prev, regex: e.target.value }))}
                        className="mt-1 w-full rounded-md border border-gray-300 bg-white px-2 py-1 text-sm dark:border-gray-700 dark:bg-gray-900"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Date From</label>
                      <input
                        type="datetime-local"
                        onChange={(e) => setFilter(prev => ({ ...prev, dateFrom: e.target.value ? new Date(e.target.value) : undefined }))}
                        className="mt-1 w-full rounded-md border border-gray-300 bg-white px-2 py-1 text-sm dark:border-gray-700 dark:bg-gray-900"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Date To</label>
                      <input
                        type="datetime-local"
                        onChange={(e) => setFilter(prev => ({ ...prev, dateTo: e.target.value ? new Date(e.target.value) : undefined }))}
                        className="mt-1 w-full rounded-md border border-gray-300 bg-white px-2 py-1 text-sm dark:border-gray-700 dark:bg-gray-900"
                      />
                    </div>
                    <div className="flex items-end">
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={filter.caseSensitive}
                          onChange={(e) => setFilter(prev => ({ ...prev, caseSensitive: e.target.checked }))}
                          className="rounded border-gray-300 text-brand-500 focus:ring-brand-500"
                        />
                        Case Sensitive
                      </label>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Statistics Panel */}
      <AnimatePresence>
        {showStats && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-800">
              <h4 className="mb-3 text-sm font-medium text-gray-800 dark:text-white/90">Log Statistics</h4>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Total Logs</p>
                  <p className="text-2xl font-semibold text-gray-800 dark:text-white">{stats.total}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Error Rate</p>
                  <p className="text-2xl font-semibold text-red-600 dark:text-red-400">{stats.errorRate.toFixed(1)}%</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Logs/Minute</p>
                  <p className="text-2xl font-semibold text-gray-800 dark:text-white">{stats.avgLogsPerMinute.toFixed(1)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">By Level</p>
                  <div className="mt-1 flex gap-2 text-xs">
                    {Object.entries(stats.byLevel).map(([level, count]) => (
                      <span key={level} className="flex items-center gap-1">
                        <Badge size="sm" color={getLogLevelBadgeColor(level as any)}>
                          {level}: {count}
                        </Badge>
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Logs Container */}
      <div 
        ref={logsContainerRef}
        className="rounded-lg border border-gray-200 bg-gray-900 p-4 dark:border-gray-800"
        style={{ maxHeight: embedded ? '400px' : '600px', overflowY: 'auto' }}
      >
        {isLoading && logs.length === 0 ? (
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="h-4 w-16 animate-pulse rounded bg-gray-800" />
                <div className="h-4 w-12 animate-pulse rounded bg-gray-800" />
                <div className="h-4 flex-1 animate-pulse rounded bg-gray-800" />
              </div>
            ))}
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            <p>No logs match your filters</p>
            {filter.searchTerm && (
              <button
                onClick={() => setFilter(prev => ({ ...prev, searchTerm: '' }))}
                className="mt-2 text-sm text-brand-500 hover:text-brand-600"
              >
                Clear search
              </button>
            )}
          </div>
        ) : (
          <div className={`font-mono text-xs ${isCompactView ? 'space-y-0' : 'space-y-1'}`}>
            {selectedLogs.size > 0 && (
              <div className="mb-3 flex items-center justify-between rounded bg-brand-500/10 p-2 text-brand-500 dark:text-brand-400">
                <span>{selectedLogs.size} logs selected</span>
                <button
                  onClick={() => setSelectedLogs(new Set())}
                  className="text-sm hover:underline"
                >
                  Clear selection
                </button>
              </div>
            )}
            {filteredLogs.map((log, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.1, delay: index * 0.01 }}
                onClick={(e) => {
                  if (e.shiftKey) {
                    // Multi-select with shift
                    const newSelected = new Set(selectedLogs);
                    if (newSelected.has(index)) {
                      newSelected.delete(index);
                    } else {
                      newSelected.add(index);
                    }
                    setSelectedLogs(newSelected);
                  }
                }}
                className={`flex items-start gap-3 text-gray-300 ${
                  isCompactView ? 'py-0.5' : 'py-1'
                } ${
                  selectedLogs.has(index) ? 'bg-brand-500/20' : 'hover:bg-gray-800'
                } rounded cursor-pointer transition-colors`}
              >
                <span className="text-gray-500 select-none">{formatLogTime(log.timestamp)}</span>
                <Badge 
                  size="sm" 
                  color={getLogLevelBadgeColor(log.level)} 
                  className="min-w-[60px] text-center select-none"
                >
                  {log.level.toUpperCase()}
                </Badge>
                <span className="flex-1 whitespace-pre-wrap break-all">
                  {highlightText(log.message)}
                  {Object.keys(log.data).length > 0 && (
                    <span className="ml-2 text-gray-500">
                      {highlightText(JSON.stringify(log.data))}
                    </span>
                  )}
                </span>
              </motion.div>
            ))}
            <div ref={logsEndRef} />
          </div>
        )}
      </div>

      {/* Status Bar */}
      <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
        <span>
          Showing {filteredLogs.length} of {logs.length} logs
          {selectedLogs.size > 0 && ` • ${selectedLogs.size} selected`}
          {isPaused && ' • Paused'}
        </span>
        {session?.status === 'running' && !isPaused && (
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 animate-pulse rounded-full bg-green-500" />
            Live - refreshing every {refreshInterval/1000}s
          </span>
        )}
      </div>
    </div>
  );
};

export default EnhancedLogViewer;
