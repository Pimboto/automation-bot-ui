///Users/tinder/Work/automation-bot-ui/src/components/automation/SessionsList.tsx

"use client";
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { apiService, AutomationSession, getAutomationStatusColor, formatTimestamp } from '@/services/api';
import Badge from "../ui/badge/Badge";


import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHeader, 
  TableRow 
} from '../ui/table';
import { useInterval } from '@/hooks/useInterval';

interface SessionWithExtras extends AutomationSession {
  currentCheckpoint?: string;
  logsCount?: number;
}

const SessionsList: React.FC = () => {
  const router = useRouter();
  const [sessions, setSessions] = useState<SessionWithExtras[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterFlow, setFilterFlow] = useState<string>('all');
  const [showOnlyActive, setShowOnlyActive] = useState(false);

  const fetchSessions = async () => {
    try {
      setError(null);
      // Get all automation sessions
      const response = await apiService.getAutomationSessions();
      
      setSessions(response.sessions);
    } catch (err) {
      console.error('Error fetching sessions:', err);
      setError('Failed to load sessions');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  // Auto-refresh every 5 seconds for active sessions
  useInterval(() => {
    if (sessions.some(s => s.status === 'running' || s.status === 'initializing')) {
      fetchSessions();
    }
  }, 5000);

  const handleViewLogs = (sessionId: string) => {
    router.push(`/sessions/${sessionId}`);
  };

  const handleStopSession = async (sessionId: string) => {
    if (!confirm('Are you sure you want to stop this automation?')) return;

    try {
      await apiService.stopAutomation(sessionId);
      // Refresh sessions
      await fetchSessions();
    } catch (err) {
      console.error('Error stopping session:', err);
      alert('Failed to stop session');
    }
  };

  const getStatusIcon = (status: AutomationSession['status']) => {
    switch (status) {
      case 'running':
        return '🟢';
      case 'completed':
        return '✅';
      case 'error':
        return '❌';
      case 'stopped':
        return '🛑';
      case 'initializing':
        return '🔄';
      default:
        return '⏸️';
    }
  };

  const filteredSessions = sessions.filter(session => {
    if (showOnlyActive && session.status !== 'running' && session.status !== 'initializing') {
      return false;
    }
    if (filterFlow !== 'all' && session.flow !== filterFlow) {
      return false;
    }
    return true;
  });

  const uniqueFlows = [...new Set(sessions.map(s => s.flow))];

  return (
    <div className="space-y-4">
      {/* Header with filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
            Automation Sessions
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Monitor and manage your automation sessions
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={showOnlyActive}
              onChange={(e) => setShowOnlyActive(e.target.checked)}
              className="rounded border-gray-300 text-brand-500 focus:ring-brand-500"
            />
            Active only
          </label>
          
          <select
            value={filterFlow}
            onChange={(e) => setFilterFlow(e.target.value)}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
          >
            <option value="all">All Flows</option>
            {uniqueFlows.map(flow => (
              <option key={flow} value={flow}>{flow}</option>
            ))}
          </select>
          
          <button
            onClick={fetchSessions}
            disabled={isLoading}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
          >
            🔄 Refresh
          </button>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
          <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
        </div>
      )}

      {/* Sessions Table */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="max-w-full overflow-x-auto">
          <Table>
            <TableHeader className="border-b border-gray-100 dark:border-gray-800">
              <TableRow>
                <TableCell
                  isHeader
                  className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                >
                  Session
                </TableCell>
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
                  Flow
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
                  Progress
                </TableCell>
                <TableCell
                  isHeader
                  className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                >
                  Started
                </TableCell>
                <TableCell
                  isHeader
                  className="px-5 py-3 font-medium text-gray-500 text-center text-theme-xs dark:text-gray-400"
                >
                  Actions
                </TableCell>
              </TableRow>
            </TableHeader>

            <TableBody className="divide-y divide-gray-100 dark:divide-gray-800">
              {isLoading ? (
                // Loading skeleton
                [...Array(3)].map((_, i) => (
                  <TableRow key={i}>
                    <TableCell className="px-5 py-4">
                      <div className="h-4 w-32 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
                    </TableCell>
                    <TableCell className="px-5 py-4">
                      <div className="h-4 w-24 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
                    </TableCell>
                    <TableCell className="px-5 py-4">
                      <div className="h-6 w-16 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
                    </TableCell>
                    <TableCell className="px-5 py-4">
                      <div className="h-6 w-20 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
                    </TableCell>
                    <TableCell className="px-5 py-4">
                      <div className="h-4 w-32 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
                    </TableCell>
                    <TableCell className="px-5 py-4">
                      <div className="h-4 w-28 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
                    </TableCell>
                    <TableCell className="px-5 py-4">
                      <div className="h-8 w-20 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
                    </TableCell>
                  </TableRow>
                ))
              ) : filteredSessions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="px-5 py-8 text-center">
                    <div className="text-gray-500 dark:text-gray-400">
                      <p className="text-lg">📋</p>
                      <p className="mt-2">No sessions found</p>
                      <p className="text-sm">
                        {showOnlyActive 
                          ? 'No active sessions at the moment' 
                          : 'Start an automation to see sessions here'
                        }
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredSessions.map((session) => (
                  <TableRow key={session.id}>
                    <TableCell className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{getStatusIcon(session.status)}</span>
                        <div>
                          <p className="font-mono text-xs text-gray-600 dark:text-gray-400">
                            {session.id.split('-')[0]}...
                          </p>
                          {session.runCount !== undefined && (
                            <p className="text-xs text-gray-500 dark:text-gray-500">
                              Run #{session.runCount}/{session.maxRuns}
                            </p>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="px-5 py-4">
                      <div>
                        <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                          {session.deviceInfo?.name ?? 'Unknown'}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {session.udid?.substring(0, 16)}...
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="px-5 py-4">
                      <Badge size="sm" color="primary">
                        {session.flow}
                      </Badge>
                    </TableCell>
                    <TableCell className="px-5 py-4">
                      <Badge
                        size="sm"
                        color={getAutomationStatusColor(session.status)}
                      >
                        {session.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="px-5 py-4">
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {session.checkpoint}
                        </p>
                        {session.infinite && (
                          <p className="text-xs text-gray-500 dark:text-gray-500">
                            ♾️ Infinite mode
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="px-5 py-4 text-sm text-gray-600 dark:text-gray-400">
                      {session.startTime ? formatTimestamp(session.startTime) : '-'}
                    </TableCell>
                    <TableCell className="px-5 py-4">
                      <div className="flex justify-center gap-2">
                        <button
                          onClick={() => handleViewLogs(session.id)}
                          className="inline-flex items-center rounded bg-blue-500 px-2 py-1 text-xs font-medium text-white hover:bg-blue-600"
                        >
                          📋 Logs
                        </button>
                        {(session.status === 'running' || session.status === 'initializing') && (
                          <button
                            onClick={() => handleStopSession(session.id)}
                            className="inline-flex items-center rounded bg-red-500 px-2 py-1 text-xs font-medium text-white hover:bg-red-600"
                          >
                            ⏹️ Stop
                          </button>
                        )}
                      </div>
                    </TableCell>
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

export default SessionsList;
