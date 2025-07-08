// src/components/notifications/NotificationSystem.tsx
"use client";
import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export type NotificationType = 'success' | 'error' | 'warning' | 'info';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message?: string;
  duration?: number;
  actions?: Array<{
    label: string;
    onClick: () => void;
  }>;
  deviceInfo?: {
    name: string;
    udid: string;
  };
  timestamp: Date;
}

interface NotificationContextType {
  notifications: Notification[];
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp'>) => void;
  removeNotification: (id: string) => void;
  clearAll: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within NotificationProvider');
  }
  return context;
};

interface NotificationProviderProps {
  children: React.ReactNode;
  maxNotifications?: number;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ 
  children, 
  maxNotifications = 5 
}) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const addNotification = useCallback((notification: Omit<Notification, 'id' | 'timestamp'>) => {
    const newNotification: Notification = {
      ...notification,
      id: Date.now().toString(),
      timestamp: new Date(),
      duration: notification.duration || 5000
    };

    setNotifications(prev => {
      const updated = [newNotification, ...prev];
      // Keep only the latest maxNotifications
      return updated.slice(0, maxNotifications);
    });

    // Auto-remove after duration
    if (newNotification.duration && newNotification.duration > 0) {
      setTimeout(() => {
        removeNotification(newNotification.id);
      }, newNotification.duration);
    }
  }, [maxNotifications]);

  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  return (
    <NotificationContext.Provider value={{ notifications, addNotification, removeNotification, clearAll }}>
      {children}
      <NotificationContainer />
    </NotificationContext.Provider>
  );
};

// Notification Container Component
const NotificationContainer: React.FC = () => {
  const { notifications, removeNotification } = useNotifications();

  return (
    <div className="fixed top-4 right-4 z-50 space-y-3 pointer-events-none">
      <AnimatePresence>
        {notifications.map(notification => (
          <NotificationToast
            key={notification.id}
            notification={notification}
            onClose={() => removeNotification(notification.id)}
          />
        ))}
      </AnimatePresence>
    </div>
  );
};

// Individual Toast Component
interface NotificationToastProps {
  notification: Notification;
  onClose: () => void;
}

const NotificationToast: React.FC<NotificationToastProps> = ({ notification, onClose }) => {
  const getIcon = () => {
    switch (notification.type) {
      case 'success':
        return '✅';
      case 'error':
        return '❌';
      case 'warning':
        return '⚠️';
      case 'info':
        return 'ℹ️';
    }
  };

  const getColors = () => {
    switch (notification.type) {
      case 'success':
        return 'bg-green-50 border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-800 dark:text-green-200';
      case 'error':
        return 'bg-red-50 border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-800 dark:text-red-200';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800 dark:bg-yellow-900/20 dark:border-yellow-800 dark:text-yellow-200';
      case 'info':
        return 'bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-200';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 100, scale: 0.8 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 100, scale: 0.8 }}
      transition={{ type: 'spring', damping: 25, stiffness: 300 }}
      className={`pointer-events-auto max-w-sm rounded-xl border shadow-lg ${getColors()} backdrop-blur-sm`}
    >
      <div className="p-4">
        <div className="flex items-start gap-3">
          <span className="text-2xl flex-shrink-0">{getIcon()}</span>
          <div className="flex-1">
            <h4 className="font-semibold text-sm">{notification.title}</h4>
            {notification.message && (
              <p className="text-xs mt-1 opacity-90">{notification.message}</p>
            )}
            {notification.deviceInfo && (
              <div className="flex items-center gap-2 mt-2 text-xs opacity-75">
                <span>📱</span>
                <span>{notification.deviceInfo.name}</span>
                <span>•</span>
                <span className="font-mono">{notification.deviceInfo.udid.substring(0, 8)}...</span>
              </div>
            )}
            {notification.actions && notification.actions.length > 0 && (
              <div className="flex gap-2 mt-3">
                {notification.actions.map((action, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      action.onClick();
                      onClose();
                    }}
                    className="text-xs font-medium px-3 py-1 rounded-md bg-white/50 hover:bg-white/70 dark:bg-gray-800/50 dark:hover:bg-gray-800/70 transition-colors"
                  >
                    {action.label}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button
            onClick={onClose}
            className="flex-shrink-0 text-lg opacity-50 hover:opacity-100 transition-opacity"
          >
            ×
          </button>
        </div>
      </div>
      {/* Progress bar for auto-dismiss */}
      {notification.duration && notification.duration > 0 && (
        <motion.div
          initial={{ width: '100%' }}
          animate={{ width: '0%' }}
          transition={{ duration: notification.duration / 1000, ease: 'linear' }}
          className="h-0.5 bg-current opacity-20"
        />
      )}
    </motion.div>
  );
};

// Notification Hook with predefined methods
export const useNotificationActions = () => {
  const { addNotification } = useNotifications();

  const notifySessionStarted = useCallback((deviceName: string, sessionId: string) => {
    addNotification({
      type: 'success',
      title: 'Automation Started',
      message: `Session ${sessionId.split('-')[0]} started successfully`,
      deviceInfo: { name: deviceName, udid: sessionId },
      duration: 5000
    });
  }, [addNotification]);

  const notifySessionCompleted = useCallback((deviceName: string, sessionId: string) => {
    addNotification({
      type: 'info',
      title: 'Automation Completed',
      message: 'Session finished successfully',
      deviceInfo: { name: deviceName, udid: sessionId },
      duration: 7000
    });
  }, [addNotification]);

  const notifySessionError = useCallback((deviceName: string, sessionId: string, error: string) => {
    addNotification({
      type: 'error',
      title: 'Automation Error',
      message: error,
      deviceInfo: { name: deviceName, udid: sessionId },
      duration: 10000,
      actions: [
        {
          label: 'View Logs',
          onClick: () => window.location.href = `/sessions/${sessionId}`
        }
      ]
    });
  }, [addNotification]);

  const notifyDeviceDisconnected = useCallback((deviceName: string) => {
    addNotification({
      type: 'warning',
      title: 'Device Disconnected',
      message: `${deviceName} is no longer available`,
      duration: 8000
    });
  }, [addNotification]);

  return {
    notifySessionStarted,
    notifySessionCompleted,
    notifySessionError,
    notifyDeviceDisconnected,
    addNotification
  };
};
