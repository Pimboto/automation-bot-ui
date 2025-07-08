// src/components/automation/MultiLogViewer.tsx
"use client";
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { apiService, AutomationSession, AutomationLog, getAutomationStatusColor } from '@/services/api';
import Badge from '../ui/badge/Badge';
import Button from '../ui/button/Button';
import { useInterval } from '@/hooks/useInterval';
import { Modal } from '../ui/modal';
import { useModal } from '@/hooks/useModal';
import { useNotificationActions } from '@/components/notifications/NotificationSystem';

interface LogSession {
  session: AutomationSession;
  logs: AutomationLog[];
  isLoading: boolean;
  error: string | null;
  isPaused: boolean;
  autoScroll: boolean;
  searchTerm: string;
  logLevel: 'all' | 'info' | 'warn' | 'error' | 'debug';
  lastUpdate: Date;
}

interface LayoutType {
  name: string;
  icon: React.ReactNode;
  gridClass: string;
}

const layouts: LayoutType[] = [
  {
    name: 'Single',
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
        <rect x="2" y="2" width="12" height="12" rx="1"/>
      </svg>
    ),
    gridClass: 'grid-cols-1'
  },
  {
    name: 'Split',
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
        <rect x="2" y="2" width="5" height="12" rx="1"/>
        <rect x="9" y="2" width="5" height="12" rx="1"/>
      </svg>
    ),
    gridClass: 'grid-cols-1 lg:grid-cols-2'
  },
  {
    name: 'Triple',
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
        <rect x="2" y="2" width="3.5" height="12" rx="0.5"/>
        <rect x="6.25" y="2" width="3.5" height="12" rx="0.5"/>
        <rect x="10.5" y="2" width="3.5" height="12" rx="0.5"/>
      </svg>
    ),
    gridClass: 'grid-cols-1 lg:grid-cols-3'
  },
  {
    name: 'Quad',
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
        <rect x="2" y="2" width="5" height="5" rx="1"/>
        <rect x="9" y="2" width="5" height="5" rx="1"/>
        <rect x="2" y="9" width="5" height="5" rx="1"/>
        <rect x="9" y="9" width="5" height="5" rx="1"/>
      </svg>
    ),
    gridClass: 'grid-cols-1 lg:grid-cols-2 xl:grid-cols-2'
  }
];

const STORAGE_KEY = 'multilog-sessions';

const MultiLogViewer: React.FC = () => {
  const [sessions, setSessions] = useState<Map<string, LogSession>>(new Map());
  const [availableSessions, setAvailableSessions] = useState<AutomationSession[]>([]);
  const [selectedLayout, setSelectedLayout] = useState<LayoutType>(layouts[1]); // Default to split view
  const [globalRefreshInterval, setGlobalRefreshInterval] = useState(2000);
  const [isLoadingAvailable, setIsLoadingAvailable] = useState(true);
  const [stoppingSession, setStoppingSession] = useState<string | null>(null);
  const addSessionModal = useModal();
  const settingsModal = useModal();
  const { addNotification } = useNotificationActions();

  // Load saved sessions from localStorage on mount
  useEffect(() => {
    const savedSessionIds = localStorage.getItem(STORAGE_KEY);
    if (savedSessionIds) {
      try {
        const ids = JSON.parse(savedSessionIds);
        // Fetch and add each saved session
        ids.forEach(async (id: string) => {
          try {
            const response = await apiService.getAutomationStatus(id);
            if (response.session) {
              addSession(response.session, false); // false = don't save to storage again
            }
          } catch (err) {
            console.error(`Failed to restore session ${id}:`, err);
          }
        });
      } catch (err) {
        console.error('Error parsing saved sessions:', err);
      }
    }
  }, []);

  // Save session IDs to localStorage whenever sessions change
  const saveSessionsToStorage = useCallback(() => {
    const sessionIds = Array.from(sessions.keys());
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessionIds));
  }, [sessions]);

  // Fetch available sessions
  const fetchAvailableSessions = useCallback(async () => {
    try {
      const response = await apiService.getAutomationSessions();
      console.log('Sessions response:', response);
      
      const runningSessions = response.sessions.filter(
        s => (s.status === 'running' || s.status === 'initializing') ||
             ((s as any).state === 'running' || (s as any).state === 'initializing')
      );
      
      console.log('Running sessions:', runningSessions);
      setAvailableSessions(runningSessions);
    } catch (err) {
      console.error('Error fetching available sessions:', err);
    } finally {
      setIsLoadingAvailable(false);
    }
  }, []);

  // Fetch logs for a specific session
  const fetchSessionLogs = useCallback(async (sessionId: string) => {
    const session = sessions.get(sessionId);
    if (!session || session.isPaused) return;

    try {
      const [statusResponse, logsResponse] = await Promise.all([
        apiService.getAutomationStatus(sessionId),
        apiService.getAutomationLogs(
          sessionId, 
          100, 
          session.logLevel === 'all' ? undefined : session.logLevel
        )
      ]);

      setSessions(prev => {
        const updated = new Map(prev);
        const current = updated.get(sessionId);
        if (current) {
          updated.set(sessionId, {
            ...current,
            session: statusResponse.session,
            logs: logsResponse.logs,
            lastUpdate: new Date(),
            error: null
          });
        }
        return updated;
      });
    } catch (err) {
      console.error(`Error fetching logs for ${sessionId}:`, err);
      setSessions(prev => {
        const updated = new Map(prev);
        const current = updated.get(sessionId);
        if (current) {
          updated.set(sessionId, {
            ...current,
            error: 'Failed to fetch logs',
            isLoading: false
          });
        }
        return updated;
      });
    }
  }, [sessions]);

  // Add a new session to monitor
  const addSession = (session: AutomationSession, saveToStorage = true) => {
    // Normalize session data
    const normalizedSession = {
      ...session,
      status: session.status || (session as any).state,
      checkpoint: session.checkpoint || (session as any).currentCheckpoint
    };

    setSessions(prev => {
      const updated = new Map(prev);
      updated.set(normalizedSession.id, {
        session: normalizedSession,
        logs: [],
        isLoading: true,
        error: null,
        isPaused: false,
        autoScroll: true,
        searchTerm: '',
        logLevel: 'all',
        lastUpdate: new Date()
      });
      return updated;
    });

    // Save to storage if needed
    if (saveToStorage) {
      setTimeout(saveSessionsToStorage, 100);
    }

    // Immediately fetch logs
    fetchSessionLogs(normalizedSession.id);
  };

  // Remove session
  const removeSession = (sessionId: string) => {
    setSessions(prev => {
      const updated = new Map(prev);
      updated.delete(sessionId);
      return updated;
    });
    
    // Update storage
    setTimeout(saveSessionsToStorage, 100);
  };

  // Stop session
  const stopSession = async (sessionId: string) => {
    if (!confirm('Are you sure you want to stop this automation?')) return;

    setStoppingSession(sessionId);
    
    try {
      await apiService.stopAutomation(sessionId);
      
      // Update session status
      await fetchSessionLogs(sessionId);
      
      addNotification({
        type: 'success',
        title: 'Session Stopped',
        message: 'Automation has been stopped successfully'
      });
    } catch (err) {
      console.error('Error stopping session:', err);
      addNotification({
        type: 'error',
        title: 'Failed to Stop',
        message: err instanceof Error ? err.message : 'Failed to stop session'
      });
    } finally {
      setStoppingSession(null);
    }
  };

  // Toggle pause for a session
  const togglePause = (sessionId: string) => {
    setSessions(prev => {
      const updated = new Map(prev);
      const session = updated.get(sessionId);
      if (session) {
        updated.set(sessionId, {
          ...session,
          isPaused: !session.isPaused
        });
      }
      return updated;
    });
  };

  // Update session settings
  const updateSessionSettings = (sessionId: string, updates: Partial<LogSession>) => {
    setSessions(prev => {
      const updated = new Map(prev);
      const session = updated.get(sessionId);
      if (session) {
        updated.set(sessionId, {
          ...session,
          ...updates
        });
      }
      return updated;
    });
  };

  // Export all logs
  const exportAllLogs = () => {
    const allLogs: Record<string, any> = {};
    
    sessions.forEach((session, id) => {
      allLogs[id] = {
        device: session.session.deviceInfo?.name || 'Unknown',
        udid: session.session.udid,
        flow: session.session.flow,
        status: session.session.status,
        logs: session.logs.map(log => ({
          time: log.timestamp,
          level: log.level,
          message: log.message,
          data: log.data
        }))
      };
    });

    const blob = new Blob([JSON.stringify(allLogs, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `multi-logs-${new Date().toISOString()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Clear all sessions
  const clearAllSessions = () => {
    if (confirm('Are you sure you want to remove all sessions from the viewer?')) {
      setSessions(new Map());
      localStorage.removeItem(STORAGE_KEY);
    }
  };

  // Initial load
  useEffect(() => {
    fetchAvailableSessions();
  }, [fetchAvailableSessions]);

  // Auto-refresh available sessions
  useInterval(fetchAvailableSessions, 10000);

  // Auto-refresh logs for all sessions
  useInterval(() => {
    sessions.forEach((_, sessionId) => {
      fetchSessionLogs(sessionId);
    });
  }, globalRefreshInterval);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-gray-800 dark:text-white/90 flex items-center gap-3">
              <span className="text-3xl">📊</span>
              Multi-Log Viewer
            </h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Monitor multiple automation sessions simultaneously
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Layout Selector */}
            <div className="flex gap-1 rounded-lg bg-gray-100 p-1 dark:bg-gray-800">
              {layouts.map(layout => (
                <button
                  key={layout.name}
                  onClick={() => setSelectedLayout(layout)}
                  className={`rounded-md p-2 transition-colors ${
                    selectedLayout.name === layout.name
                      ? 'bg-white text-brand-500 shadow-sm dark:bg-gray-700'
                      : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'
                  }`}
                  title={layout.name}
                >
                  {layout.icon}
                </button>
              ))}
            </div>

            <Button
              size="sm"
              variant="outline"
              onClick={settingsModal.openModal}
              className="hidden sm:flex"
            >
              ⚙️ Settings
            </Button>

            <Button
              size="sm"
              variant="outline"
              onClick={clearAllSessions}
              disabled={sessions.size === 0}
            >
              🗑️ Clear All
            </Button>

            <Button
              size="sm"
              onClick={exportAllLogs}
              disabled={sessions.size === 0}
            >
              💾 Export All
            </Button>
          </div>
        </div>
      </div>

      {/* Active Sessions Info */}
      {sessions.size > 0 && (
        <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-900">
          <div className="flex items-center gap-6 text-sm">
            <span className="text-gray-600 dark:text-gray-400">
              Monitoring <strong className="text-gray-800 dark:text-white">{sessions.size}</strong> sessions
            </span>
            <span className="text-gray-600 dark:text-gray-400">
              Refresh rate: <strong className="text-gray-800 dark:text-white">{globalRefreshInterval/1000}s</strong>
            </span>
          </div>
          <button
            onClick={() => {
              sessions.forEach((_, id) => fetchSessionLogs(id));
            }}
            className="text-sm text-brand-500 hover:text-brand-600 dark:text-brand-400"
          >
            🔄 Sync All
          </button>
        </div>
      )}

      {/* Sessions Grid */}
      <div className={`grid gap-4 ${selectedLayout.gridClass}`}>
        {Array.from(sessions.entries()).map(([sessionId, sessionData]) => (
          <LogPanel
            key={sessionId}
            sessionId={sessionId}
            sessionData={sessionData}
            onRemove={() => removeSession(sessionId)}
            onStop={() => stopSession(sessionId)}
            onTogglePause={() => togglePause(sessionId)}
            onUpdateSettings={(updates) => updateSessionSettings(sessionId, updates)}
            isStoppingSession={stoppingSession === sessionId}
          />
        ))}

        {/* Add Session Button */}
        <div 
          onClick={addSessionModal.openModal}
          className="min-h-[400px] rounded-2xl border-2 border-dashed border-gray-300 bg-gray-50 flex items-center justify-center cursor-pointer hover:border-brand-500 hover:bg-gray-100 transition-all dark:border-gray-700 dark:bg-gray-900 dark:hover:border-brand-400 dark:hover:bg-gray-800"
        >
          <div className="text-center">
            <div className="text-5xl mb-3">➕</div>
            <p className="text-gray-600 dark:text-gray-400 font-medium">Add Session</p>
            <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
              {availableSessions.length} sessions available
            </p>
          </div>
        </div>
      </div>

      {/* Add Session Modal */}
      <Modal
        isOpen={addSessionModal.isOpen}
        onClose={addSessionModal.closeModal}
        className="max-w-2xl p-6"
      >
        <h3 className="text-lg font-medium text-gray-800 dark:text-white/90 mb-4">
          Add Session to Monitor
        </h3>

        {isLoadingAvailable ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-500 mx-auto"></div>
          </div>
        ) : availableSessions.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <p className="text-2xl mb-2">🔍</p>
            <p>No active sessions found</p>
            <p className="text-sm mt-2">Make sure you have running sessions</p>
            <button
              onClick={() => {
                // Show all sessions as fallback
                apiService.getAutomationSessions().then(response => {
                  setAvailableSessions(response.sessions);
                });
              }}
              className="mt-3 text-brand-500 hover:text-brand-600 text-sm"
            >
              Show all sessions →
            </button>
          </div>
        ) : (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {availableSessions.map(session => {
              const isAlreadyAdded = sessions.has(session.id);
              
              return (
                <div
                  key={session.id}
                  onClick={() => {
                    if (!isAlreadyAdded) {
                      addSession(session);
                      addSessionModal.closeModal();
                    }
                  }}
                  className={`flex items-center justify-between p-4 rounded-lg border transition-colors ${
                    isAlreadyAdded 
                      ? 'border-gray-300 bg-gray-100 cursor-not-allowed opacity-50 dark:border-gray-600 dark:bg-gray-800' 
                      : 'border-gray-200 hover:bg-gray-50 cursor-pointer dark:border-gray-700 dark:hover:bg-gray-800'
                  }`}
                >
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <span className="text-xl">📱</span>
                      <h4 className="font-medium text-gray-800 dark:text-white/90">
                        {session.deviceInfo?.name || 'Unknown Device'}
                      </h4>
                      <Badge size="sm" color={getAutomationStatusColor(session.status || (session as any).state)}>
                        {session.status || (session as any).state}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                      <span>Flow: {session.flow}</span>
                      <span>•</span>
                      <span>Checkpoint: {session.checkpoint || (session as any).currentCheckpoint}</span>
                      <span>•</span>
                      <span>ID: {session.id.split('-')[0]}</span>
                    </div>
                  </div>
                  <div className="text-2xl">
                    {isAlreadyAdded ? '✅' : '➕'}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Modal>

      {/* Settings Modal */}
      <Modal
        isOpen={settingsModal.isOpen}
        onClose={settingsModal.closeModal}
        className="max-w-md p-6"
      >
        <h3 className="text-lg font-medium text-gray-800 dark:text-white/90 mb-4">
          ⚙️ Multi-Log Settings
        </h3>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Global Refresh Interval
            </label>
            <select
              value={globalRefreshInterval}
              onChange={(e) => setGlobalRefreshInterval(Number(e.target.value))}
              className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
            >
              <option value={1000}>1 second</option>
              <option value={2000}>2 seconds</option>
              <option value={5000}>5 seconds</option>
              <option value={10000}>10 seconds</option>
              <option value={30000}>30 seconds</option>
            </select>
          </div>

          <div className="border-t pt-4 dark:border-gray-700">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Layout Information
            </h4>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              You can add unlimited sessions. Use different layouts to organize your view:
            </p>
            <ul className="mt-2 text-sm text-gray-600 dark:text-gray-400 space-y-1">
              <li>• Single: 1 column view</li>
              <li>• Split: 2 columns view</li>
              <li>• Triple: 3 columns view</li>
              <li>• Quad: 2x2 grid view</li>
            </ul>
          </div>

          <div className="border-t pt-4 dark:border-gray-700">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Session Persistence
            </h4>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Your selected sessions are automatically saved and will be restored when you return to this page.
            </p>
          </div>
        </div>
      </Modal>
    </div>
  );
};

// Individual Log Panel Component
interface LogPanelProps {
  sessionId: string;
  sessionData: LogSession;
  onRemove: () => void;
  onStop: () => void;
  onTogglePause: () => void;
  onUpdateSettings: (updates: Partial<LogSession>) => void;
  isStoppingSession: boolean;
}

const LogPanel: React.FC<LogPanelProps> = ({
  sessionId,
  sessionData,
  onRemove,
  onStop,
  onTogglePause,
  onUpdateSettings,
  isStoppingSession
}) => {
  const logsEndRef = useRef<HTMLDivElement>(null);
  const { session, logs, isPaused, autoScroll, searchTerm, logLevel, lastUpdate } = sessionData;

  // Auto-scroll effect
  useEffect(() => {
    if (autoScroll && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, autoScroll]);

  // Filter logs
  const filteredLogs = logs.filter(log => {
    const matchesSearch = log.message.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesLevel = logLevel === 'all' || log.level === logLevel;
    return matchesSearch && matchesLevel;
  });

  const getLogLevelColor = (level: string) => {
    switch (level) {
      case 'info': return 'text-blue-500 bg-blue-50 dark:bg-blue-900/20';
      case 'warn': return 'text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20';
      case 'error': return 'text-red-500 bg-red-50 dark:bg-red-900/20';
      case 'debug': return 'text-gray-500 bg-gray-50 dark:bg-gray-800';
      default: return 'text-gray-500 bg-gray-50 dark:bg-gray-800';
    }
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      fractionalSecondDigits: 3
    });
  };

  const isRunning = session.status === 'running' || (session as any).state === 'running';

  return (
    <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03] overflow-hidden flex flex-col h-[600px]">
      {/* Header */}
      <div className="bg-gray-50 dark:bg-gray-800 px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">📱</span>
            <div>
              <h3 className="font-medium text-gray-800 dark:text-white/90">
                {session.deviceInfo?.name || 'Unknown Device'}
              </h3>
              <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                <span>{session.deviceInfo?.version}</span>
                <span>•</span>
                <span>{session.flow}</span>
                <span>•</span>
                <span title={sessionId}>{sessionId.split('-')[0]}...</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge size="sm" color={getAutomationStatusColor(session.status || (session as any).state)}>
              {session.status || (session as any).state}
            </Badge>
            {isRunning && (
              <button
                onClick={onStop}
                disabled={isStoppingSession}
                className={`text-xs px-2 py-1 rounded font-medium transition-colors ${
                  isStoppingSession 
                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed' 
                    : 'bg-red-100 text-red-600 hover:bg-red-200 dark:bg-red-900/20 dark:text-red-400'
                }`}
                title="Stop automation"
              >
                {isStoppingSession ? '⏳' : '⏹️'} Stop
              </button>
            )}
            <button
              onClick={onRemove}
              className="text-gray-400 hover:text-red-500 transition-colors"
              title="Remove from view"
            >
              ✕
            </button>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-gray-50 dark:bg-gray-900 px-4 py-2 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-3">
          <input
            type="text"
            placeholder="Search logs..."
            value={searchTerm}
            onChange={(e) => onUpdateSettings({ searchTerm: e.target.value })}
            className="flex-1 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm dark:border-gray-700 dark:bg-gray-800"
          />
          <select
            value={logLevel}
            onChange={(e) => onUpdateSettings({ logLevel: e.target.value as any })}
            className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm dark:border-gray-700 dark:bg-gray-800"
          >
            <option value="all">All Levels</option>
            <option value="info">Info</option>
            <option value="warn">Warnings</option>
            <option value="error">Errors</option>
            <option value="debug">Debug</option>
          </select>
          <button
            onClick={onTogglePause}
            className="rounded-md bg-gray-200 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
          >
            {isPaused ? '▶️' : '⏸️'}
          </button>
          <label className="flex items-center gap-1 text-sm">
            <input
              type="checkbox"
              checked={autoScroll}
              onChange={(e) => onUpdateSettings({ autoScroll: e.target.checked })}
              className="rounded border-gray-300 text-brand-500 focus:ring-brand-500"
            />
            <span className="text-gray-600 dark:text-gray-400">Auto</span>
          </label>
        </div>
      </div>

      {/* Logs */}
      <div className="flex-1 overflow-y-auto p-4 font-mono text-xs">
        {filteredLogs.length === 0 ? (
          <div className="text-center text-gray-500 dark:text-gray-400 py-8">
            <p>No logs match your filters</p>
          </div>
        ) : (
          <div className="space-y-1">
            {filteredLogs.map((log, index) => (
              <div key={index} className="flex items-start gap-3 py-1 hover:bg-gray-50 dark:hover:bg-gray-800 rounded">
                <span className="text-gray-500 dark:text-gray-500 whitespace-nowrap">
                  {formatTime(log.timestamp)}
                </span>
                <span className={`px-2 py-0.5 rounded text-xs font-medium uppercase whitespace-nowrap ${getLogLevelColor(log.level)}`}>
                  {log.level}
                </span>
                <span className="text-gray-700 dark:text-gray-300 break-all">
                  {log.message}
                  {Object.keys(log.data).length > 0 && (
                    <span className="text-gray-500 dark:text-gray-500 ml-2">
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

      {/* Footer */}
      <div className="bg-gray-50 dark:bg-gray-900 px-4 py-2 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
          <span>{filteredLogs.length} logs</span>
          <div className="flex items-center gap-2">
            {!isPaused && isRunning && (
              <>
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                <span>Live</span>
              </>
            )}
            {isPaused && <span>Paused</span>}
            <span>• Last update: {lastUpdate.toLocaleTimeString()}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MultiLogViewer;
