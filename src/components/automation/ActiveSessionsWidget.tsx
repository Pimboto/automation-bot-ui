///Users/tinder/Work/automation-bot-ui/src/components/automation/ActiveSessionsWidget.tsx
"use client";
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { apiService, AutomationSession } from '@/services/api';
import Badge from '../ui/badge/Badge';
import { useInterval } from '@/hooks/useInterval';

const ActiveSessionsWidget: React.FC = () => {
  const router = useRouter();
  const [sessions, setSessions] = useState<AutomationSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchActiveSessions = async () => {
    try {
      const response = await apiService.getAutomationSessions();
      const activeSessions = response.sessions.filter(
        s => s.status === 'running' || s.status === 'initializing'
      );
      setSessions(activeSessions);
    } catch (err) {
      console.error('Error fetching active sessions:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchActiveSessions();
  }, []);

  // Auto-refresh every 5 seconds
  useInterval(fetchActiveSessions, 5000);

  const handleViewSession = (sessionId: string) => {
    router.push(`/sessions/${sessionId}`);
  };

  const handleViewAll = () => {
    router.push('/sessions');
  };

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] sm:p-6">
        <div className="animate-pulse space-y-3">
          <div className="h-6 bg-gray-200 rounded w-32 dark:bg-gray-700"></div>
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-200 rounded dark:bg-gray-700"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] sm:p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
          Active Sessions
        </h3>
        <button
          onClick={handleViewAll}
          className="text-sm text-brand-500 hover:text-brand-600 dark:text-brand-400"
        >
          View All →
        </button>
      </div>

      {sessions.length === 0 ? (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          <p className="text-2xl mb-2">🌟</p>
          <p>No active sessions</p>
          <p className="text-sm mt-1">Start an automation to see it here</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sessions.map((session) => (
            <div
              key={session.id}
              className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              onClick={() => handleViewSession(session.id)}
            >
              <div className="flex items-center gap-3">
                <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse" />
                <div>
                  <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                    {session.flow} on {session.device?.name}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {session.checkpoint} • Run {session.runCount}/{session.maxRuns}
                  </p>
                </div>
              </div>
              <Badge size="sm" color="success">
                {session.status}
              </Badge>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ActiveSessionsWidget;
