// /Users/tinder/Work/automation-bot-ui/src/components/automation/LogViewer.tsx
"use client";
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { apiService, AutomationLog, AutomationSession, getAutomationStatusColor, BadgeColor} from '@/services/api';
import Badge from '../ui/badge/Badge';
import Button from '../ui/button/Button';
import { useInterval } from '@/hooks/useInterval';

interface LogViewerProps {
  sessionId: string;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

type LogLevel = 'all' | 'info' | 'warn' | 'error' | 'debug';

const LogViewer: React.FC<LogViewerProps> = ({ 
  sessionId, 
  autoRefresh = true,
  refreshInterval = 2000 
}) => {
  const [logs, setLogs] = useState<AutomationLog[]>([]);
  const [session, setSession] = useState<AutomationSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [logLevel, setLogLevel] = useState<LogLevel>('all');
  const [autoScroll, setAutoScroll] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const logsEndRef = useRef<HTMLDivElement>(null);
  const logsContainerRef = useRef<HTMLDivElement>(null);

  const fetchSessionStatus = useCallback(async () => {
    try {
      const response = await apiService.getAutomationStatus(sessionId);
      setSession(response.session);
    } catch (err) {
      console.error('Error fetching session status:', err);
    }
  }, [sessionId]);

  const fetchLogs = useCallback(async () => {
    if (isPaused) return;

    try {
      setError(null);
      const level = logLevel === 'all' ? undefined : logLevel;
      const response = await apiService.getAutomationLogs(sessionId, 100, level);
      setLogs(response.logs);
      
      // Fetch session status too
      await fetchSessionStatus();
    } catch (err) {
      console.error('Error fetching logs:', err);
      setError('Failed to load logs');
    } finally {
      setIsLoading(false);
    }
  }, [sessionId, logLevel, isPaused, fetchSessionStatus]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // Auto-refresh logs
  useInterval(() => {
    if (autoRefresh && !isPaused && session?.status === 'running') {
      fetchLogs();
    }
  }, refreshInterval);

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    if (autoScroll && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, autoScroll]);

  const handleStopSession = async () => {
    if (!confirm('Are you sure you want to stop this automation?')) return;

    try {
      await apiService.stopAutomation(sessionId);
      // Refresh status
      await fetchSessionStatus();
      await fetchLogs();
    } catch (err) {
      console.error('Error stopping session:', err);
      alert('Failed to stop session');
    }
  };

  const handleClearLogs = () => {
    setLogs([]);
  };

  const handleExportLogs = () => {
    const content = logs.map(log => 
      `[${log.timestamp}] [${log.level.toUpperCase()}] ${log.message} ${JSON.stringify(log.data)}`
    ).join('\n');
    
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `session-${sessionId}-logs.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getLogLevelBadgeColor = (level: AutomationLog['level']): BadgeColor => {
    switch (level) {
      case 'info':
        return 'info';
      case 'warn':
        return 'warning';
      case 'error':
        return 'error';
      case 'debug':
        return 'light';
      default:
        return 'light';
    }
  };

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

  if (error && !logs.length) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
        <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Session Info Header */}
      {session && (
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
                onClick={handleStopSession}
                className="bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400"
              >
                ⏹️ Stop Session
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          {/* Log Level Filter */}
          <select
            value={logLevel}
            onChange={(e) => setLogLevel(e.target.value as LogLevel)}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
          >
            <option value="all">All Levels</option>
            <option value="info">Info</option>
            <option value="warn">Warnings</option>
            <option value="error">Errors</option>
            <option value="debug">Debug</option>
          </select>

          {/* Auto Scroll Toggle */}
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
            className="inline-flex items-center gap-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
          >
            {isPaused ? '▶️ Resume' : '⏸️ Pause'}
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchLogs}
            disabled={isLoading}
            className="inline-flex items-center gap-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
          >
            🔄 Refresh
          </button>
          <button
            onClick={handleClearLogs}
            className="inline-flex items-center gap-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
          >
            🗑️ Clear
          </button>
          <button
            onClick={handleExportLogs}
            className="inline-flex items-center gap-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
          >
            💾 Export
          </button>
        </div>
      </div>

      {/* Logs Container */}
      <div 
        ref={logsContainerRef}
        className="rounded-lg border border-gray-200 bg-gray-900 p-4 dark:border-gray-800"
        style={{ maxHeight: '600px', overflowY: 'auto' }}
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
        ) : logs.length === 0 ? (
          <div className="text-center text-gray-500">
            <p>No logs available</p>
          </div>
        ) : (
          <div className="space-y-1 font-mono text-xs">
            {logs.map((log, index) => (
              <div key={index} className="flex items-start gap-3 text-gray-300">
                <span className="text-gray-500">{formatLogTime(log.timestamp)}</span>
                <Badge size="sm" color={getLogLevelBadgeColor(log.level)} className="min-w-[60px] text-center">
                  {log.level.toUpperCase()}
                </Badge>
                <span className="flex-1 whitespace-pre-wrap break-all">
                  {log.message}
                  {Object.keys(log.data).length > 0 && (
                    <span className="ml-2 text-gray-500">
                      {JSON.stringify(log.data)}
                    </span>
                  )}
                </span>
              </div>
            ))}
            <div ref={logsEndRef} />
          </div>
        )}
      </div>

      {/* Status Bar */}
      <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
        <span>{logs.length} logs{isPaused && ' (Paused)'}</span>
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

export default LogViewer;
