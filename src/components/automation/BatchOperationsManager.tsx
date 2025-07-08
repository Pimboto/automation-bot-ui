// src/components/automation/BatchOperationsManager.tsx
"use client";
import React, { useState, useEffect, useCallback } from 'react';
import { apiService, Device, AutomationStartRequest, AutomationSession } from '@/services/api';
import { useNotificationActions } from '@/components/notifications/NotificationSystem';
import { motion, AnimatePresence } from 'framer-motion';
import Badge from '../ui/badge/Badge';
import Button from '../ui/button/Button';
import { Modal } from '../ui/modal';
import { useModal } from '@/hooks/useModal';
import { useFlows } from '@/hooks/useFlow';

interface BatchConfig {
  id: string;
  name: string;
  flow: string;
  devices: string[]; // Device UDIDs
  params: Partial<AutomationStartRequest>;
  schedule?: {
    delayBetween: number; // seconds
    maxConcurrent: number;
  };
  status: 'ready' | 'running' | 'completed' | 'error' | 'paused';
}

interface BatchExecution {
  batchId: string;
  sessions: Array<{
    deviceId: string;
    sessionId?: string;
    status: 'pending' | 'running' | 'completed' | 'error';
    error?: string;
    startTime?: Date;
    endTime?: Date;
  }>;
  startTime: Date;
  endTime?: Date;
}

const BatchOperationsManager: React.FC = () => {
  const [batches, setBatches] = useState<BatchConfig[]>([]);
  const [executions, setExecutions] = useState<Map<string, BatchExecution>>(new Map());
  const [devices, setDevices] = useState<Device[]>([]);
  const [selectedDevices, setSelectedDevices] = useState<Set<string>>(new Set());
  const [isExecuting, setIsExecuting] = useState(false);
  
  const { flows } = useFlows();
  const { notifySessionStarted, notifySessionError, addNotification } = useNotificationActions();
  
  const createBatchModal = useModal();
  const executionDetailsModal = useModal();
  const [selectedExecution, setSelectedExecution] = useState<BatchExecution | null>(null);

  // Default batch configuration
  const [newBatch, setNewBatch] = useState<Partial<BatchConfig>>({
    name: '',
    flow: 'tinder',
    devices: [],
    params: {
      checkpoint: 'deletePhotos',
      generateProfile: true,
      infinite: true,
      maxRuns: 100,
      maxConsecutiveErrors: 5
    },
    schedule: {
      delayBetween: 30,
      maxConcurrent: 3
    }
  });

  // Fetch devices
  useEffect(() => {
    fetchDevices();
  }, []);

  const fetchDevices = async () => {
    try {
      const response = await apiService.getDevices();
      setDevices(response.devices);
    } catch (err) {
      console.error('Error fetching devices:', err);
    }
  };

  // Create batch
  const createBatch = () => {
    if (!newBatch.name || selectedDevices.size === 0) {
      addNotification({
        type: 'error',
        title: 'Invalid Batch',
        message: 'Please provide a name and select at least one device'
      });
      return;
    }

    const batch: BatchConfig = {
      id: Date.now().toString(),
      name: newBatch.name,
      flow: newBatch.flow || 'tinder',
      devices: Array.from(selectedDevices),
      params: newBatch.params || {},
      schedule: newBatch.schedule,
      status: 'ready'
    };

    setBatches(prev => [...prev, batch]);
    setSelectedDevices(new Set());
    setNewBatch({
      name: '',
      flow: 'tinder',
      devices: [],
      params: {
        checkpoint: 'deletePhotos',
        generateProfile: true,
        infinite: true,
        maxRuns: 100,
        maxConsecutiveErrors: 5
      },
      schedule: {
        delayBetween: 30,
        maxConcurrent: 3
      }
    });
    createBatchModal.closeModal();

    addNotification({
      type: 'success',
      title: 'Batch Created',
      message: `Batch "${batch.name}" with ${batch.devices.length} devices created successfully`
    });
  };

  // Execute batch
  const executeBatch = async (batch: BatchConfig) => {
    if (isExecuting) {
      addNotification({
        type: 'warning',
        title: 'Execution in Progress',
        message: 'Please wait for the current batch to complete'
      });
      return;
    }

    setIsExecuting(true);
    setBatches(prev => prev.map(b => b.id === batch.id ? { ...b, status: 'running' } : b));

    const execution: BatchExecution = {
      batchId: batch.id,
      sessions: batch.devices.map(deviceId => ({
        deviceId,
        status: 'pending' as const
      })),
      startTime: new Date()
    };

    setExecutions(prev => new Map(prev).set(batch.id, execution));

    // Execute sessions with delay and concurrency control
    const maxConcurrent = batch.schedule?.maxConcurrent || 3;
    const delayBetween = (batch.schedule?.delayBetween || 30) * 1000; // Convert to ms

    for (let i = 0; i < batch.devices.length; i += maxConcurrent) {
      const deviceBatch = batch.devices.slice(i, i + maxConcurrent);
      
      await Promise.all(
        deviceBatch.map(async (deviceId, index) => {
          // Add delay between starts within concurrent batch
          if (index > 0) {
            await new Promise(resolve => setTimeout(resolve, index * 5000));
          }

          try {
            // Update status to running
            updateSessionStatus(batch.id, deviceId, 'running');

            const device = devices.find(d => d.udid === deviceId);
            if (!device || !device.isAvailable) {
              throw new Error('Device not available');
            }

            const request: AutomationStartRequest = {
              udid: deviceId,
              flow: batch.flow,
              checkpoint: batch.params.checkpoint || 'deletePhotos',
              generateProfile: batch.params.generateProfile,
              infinite: batch.params.infinite,
              maxRuns: batch.params.maxRuns,
              maxConsecutiveErrors: batch.params.maxConsecutiveErrors,
              params: batch.params.params || {}
            };

            const response = await apiService.startAutomation(request);
            
            updateSessionStatus(batch.id, deviceId, 'completed', response.session.id);
            notifySessionStarted(device.name, response.session.id);

          } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to start automation';
            updateSessionStatus(batch.id, deviceId, 'error', undefined, errorMessage);
            notifySessionError(deviceId, '', errorMessage);
          }
        })
      );

      // Wait before starting next batch
      if (i + maxConcurrent < batch.devices.length) {
        await new Promise(resolve => setTimeout(resolve, delayBetween));
      }
    }

    // Update batch status
    const finalExecution = executions.get(batch.id);
    if (finalExecution) {
      const hasErrors = finalExecution.sessions.some(s => s.status === 'error');
      setBatches(prev => prev.map(b => 
        b.id === batch.id ? { ...b, status: hasErrors ? 'error' : 'completed' } : b
      ));
      
      setExecutions(prev => {
        const updated = new Map(prev);
        const exec = updated.get(batch.id);
        if (exec) {
          exec.endTime = new Date();
        }
        return updated;
      });
    }

    setIsExecuting(false);

    addNotification({
      type: finalExecution?.sessions.some(s => s.status === 'error') ? 'warning' : 'success',
      title: 'Batch Execution Completed',
      message: `Batch "${batch.name}" execution finished`,
      actions: [{
        label: 'View Details',
        onClick: () => {
          setSelectedExecution(executions.get(batch.id) || null);
          executionDetailsModal.openModal();
        }
      }]
    });
  };

  // Update session status
  const updateSessionStatus = (
    batchId: string, 
    deviceId: string, 
    status: 'pending' | 'running' | 'completed' | 'error',
    sessionId?: string,
    error?: string
  ) => {
    setExecutions(prev => {
      const updated = new Map(prev);
      const execution = updated.get(batchId);
      if (execution) {
        const session = execution.sessions.find(s => s.deviceId === deviceId);
        if (session) {
          session.status = status;
          if (sessionId) session.sessionId = sessionId;
          if (error) session.error = error;
          if (status === 'running') session.startTime = new Date();
          if (status === 'completed' || status === 'error') session.endTime = new Date();
        }
      }
      return updated;
    });
  };

  // Delete batch
  const deleteBatch = (batchId: string) => {
    setBatches(prev => prev.filter(b => b.id !== batchId));
    setExecutions(prev => {
      const updated = new Map(prev);
      updated.delete(batchId);
      return updated;
    });
  };

  // Clone batch
  const cloneBatch = (batch: BatchConfig) => {
    const cloned: BatchConfig = {
      ...batch,
      id: Date.now().toString(),
      name: `${batch.name} (Copy)`,
      status: 'ready'
    };
    setBatches(prev => [...prev, cloned]);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-gray-800 dark:text-white/90 flex items-center gap-3">
              <span className="text-3xl">🚀</span>
              Batch Operations Manager
            </h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Execute automation on multiple devices simultaneously
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <Button
              size="sm"
              variant="outline"
              onClick={fetchDevices}
            >
              🔄 Refresh Devices
            </Button>
            <Button
              size="sm"
              onClick={createBatchModal.openModal}
            >
              ➕ Create Batch
            </Button>
          </div>
        </div>
      </div>

      {/* Active Execution Status */}
      {isExecuting && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-900/20">
          <div className="flex items-center gap-3">
            <div className="h-3 w-3 bg-blue-500 rounded-full animate-pulse" />
            <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
              Batch execution in progress...
            </p>
          </div>
        </div>
      )}

      {/* Batches List */}
      {batches.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-gray-300 bg-gray-50 p-12 text-center dark:border-gray-700 dark:bg-gray-900">
          <div className="text-5xl mb-4">📋</div>
          <h3 className="text-lg font-medium text-gray-800 dark:text-white mb-2">
            No Batch Configurations
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            Create a batch to run automation on multiple devices
          </p>
          <Button onClick={createBatchModal.openModal}>
            Create Your First Batch
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {batches.map(batch => {
            const execution = executions.get(batch.id);
            const completedCount = execution?.sessions.filter(s => s.status === 'completed').length || 0;
            const errorCount = execution?.sessions.filter(s => s.status === 'error').length || 0;
            
            return (
              <motion.div
                key={batch.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-gray-800 dark:text-white">
                      {batch.name}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {batch.devices.length} devices • {batch.flow}
                    </p>
                  </div>
                  <Badge color={
                    batch.status === 'ready' ? 'info' :
                    batch.status === 'running' ? 'warning' :
                    batch.status === 'completed' ? 'success' :
                    'error'
                  }>
                    {batch.status}
                  </Badge>
                </div>

                {/* Devices Preview */}
                <div className="mb-4">
                  <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
                    Devices:
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {batch.devices.slice(0, 3).map(deviceId => {
                      const device = devices.find(d => d.udid === deviceId);
                      return (
                        <span
                          key={deviceId}
                          className="text-xs bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded"
                        >
                          {device?.name || deviceId.substring(0, 8)}
                        </span>
                      );
                    })}
                    {batch.devices.length > 3 && (
                      <span className="text-xs bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                        +{batch.devices.length - 3} more
                      </span>
                    )}
                  </div>
                </div>

                {/* Execution Progress */}
                {execution && (
                  <div className="mb-4">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-gray-600 dark:text-gray-400">Progress</span>
                      <span className="font-medium">
                        {completedCount}/{batch.devices.length}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2 dark:bg-gray-700">
                      <div 
                        className="bg-green-500 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${(completedCount / batch.devices.length) * 100}%` }}
                      />
                    </div>
                    {errorCount > 0 && (
                      <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                        {errorCount} errors
                      </p>
                    )}
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => executeBatch(batch)}
                    disabled={isExecuting || batch.status === 'running'}
                    className="flex-1"
                  >
                    {batch.status === 'running' ? '⏳ Running...' : '▶️ Execute'}
                  </Button>
                  <button
                    onClick={() => cloneBatch(batch)}
                    className="p-2 text-gray-600 hover:text-gray-800 dark:text-gray-400"
                    title="Clone batch"
                  >
                    📋
                  </button>
                  {execution && (
                    <button
                      onClick={() => {
                        setSelectedExecution(execution);
                        executionDetailsModal.openModal();
                      }}
                      className="p-2 text-blue-600 hover:text-blue-800 dark:text-blue-400"
                      title="View details"
                    >
                      📊
                    </button>
                  )}
                  <button
                    onClick={() => deleteBatch(batch.id)}
                    className="p-2 text-red-600 hover:text-red-800 dark:text-red-400"
                    title="Delete batch"
                  >
                    🗑️
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Create Batch Modal */}
      <Modal
        isOpen={createBatchModal.isOpen}
        onClose={createBatchModal.closeModal}
        className="max-w-3xl p-6"
      >
        <h3 className="text-lg font-medium text-gray-800 dark:text-white/90 mb-4">
          Create Batch Configuration
        </h3>

        <div className="space-y-4">
          {/* Batch Name */}
          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Batch Name *
            </label>
            <input
              type="text"
              value={newBatch.name || ''}
              onChange={(e) => setNewBatch(prev => ({ ...prev, name: e.target.value }))}
              className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
              placeholder="e.g., Morning Run - Group A"
            />
          </div>

          {/* Flow Selection */}
          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Flow
            </label>
            <select
              value={newBatch.flow || 'tinder'}
              onChange={(e) => setNewBatch(prev => ({ ...prev, flow: e.target.value }))}
              className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
            >
              {flows.map(flow => (
                <option key={flow.name} value={flow.name}>
                  {flow.name}
                </option>
              ))}
            </select>
          </div>

          {/* Device Selection */}
          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Select Devices ({selectedDevices.size} selected)
            </label>
            <div className="mt-2 max-h-48 overflow-y-auto space-y-2 border border-gray-200 rounded-lg p-3 dark:border-gray-700">
              {devices.filter(d => d.isAvailable).map(device => (
                <label
                  key={device.udid}
                  className="flex items-center gap-3 p-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selectedDevices.has(device.udid)}
                    onChange={(e) => {
                      const updated = new Set(selectedDevices);
                      if (e.target.checked) {
                        updated.add(device.udid);
                      } else {
                        updated.delete(device.udid);
                      }
                      setSelectedDevices(updated);
                    }}
                    className="rounded border-gray-300 text-brand-500 focus:ring-brand-500"
                  />
                  <span className="text-2xl">📱</span>
                  <div className="flex-1">
                    <p className="font-medium text-sm">{device.name}</p>
                    <p className="text-xs text-gray-500">{device.version}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Schedule Settings */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Delay Between Starts (seconds)
              </label>
              <input
                type="number"
                value={newBatch.schedule?.delayBetween || 30}
                onChange={(e) => setNewBatch(prev => ({
                  ...prev,
                  schedule: {
                    ...prev.schedule,
                    delayBetween: parseInt(e.target.value) || 30,
                    maxConcurrent: prev.schedule?.maxConcurrent || 3
                  }
                }))}
                className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
                min="0"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Max Concurrent Sessions
              </label>
              <input
                type="number"
                value={newBatch.schedule?.maxConcurrent || 3}
                onChange={(e) => setNewBatch(prev => ({
                  ...prev,
                  schedule: {
                    delayBetween: prev.schedule?.delayBetween || 30,
                    maxConcurrent: parseInt(e.target.value) || 3
                  }
                }))}
                className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
                min="1"
                max="10"
              />
            </div>
          </div>

          {/* Basic Params */}
          <div className="border-t pt-4 dark:border-gray-700">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Automation Parameters
            </h4>
            <div className="grid grid-cols-2 gap-3">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={newBatch.params?.generateProfile || false}
                  onChange={(e) => setNewBatch(prev => ({
                    ...prev,
                    params: { ...prev.params, generateProfile: e.target.checked }
                  }))}
                  className="rounded border-gray-300 text-brand-500 focus:ring-brand-500"
                />
                Generate Profile
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={newBatch.params?.infinite || false}
                  onChange={(e) => setNewBatch(prev => ({
                    ...prev,
                    params: { ...prev.params, infinite: e.target.checked }
                  }))}
                  className="rounded border-gray-300 text-brand-500 focus:ring-brand-500"
                />
                Infinite Mode
              </label>
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <Button size="sm" variant="outline" onClick={createBatchModal.closeModal}>
            Cancel
          </Button>
          <Button size="sm" onClick={createBatch}>
            Create Batch
          </Button>
        </div>
      </Modal>

      {/* Execution Details Modal */}
      <Modal
        isOpen={executionDetailsModal.isOpen}
        onClose={executionDetailsModal.closeModal}
        className="max-w-3xl p-6"
      >
        {selectedExecution && (
          <>
            <h3 className="text-lg font-medium text-gray-800 dark:text-white/90 mb-4">
              Batch Execution Details
            </h3>

            <div className="space-y-4">
              {/* Summary */}
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-600">
                    {selectedExecution.sessions.filter(s => s.status === 'completed').length}
                  </p>
                  <p className="text-sm text-gray-500">Completed</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-yellow-600">
                    {selectedExecution.sessions.filter(s => s.status === 'running').length}
                  </p>
                  <p className="text-sm text-gray-500">Running</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-red-600">
                    {selectedExecution.sessions.filter(s => s.status === 'error').length}
                  </p>
                  <p className="text-sm text-gray-500">Errors</p>
                </div>
              </div>

              {/* Sessions List */}
              <div className="border-t pt-4 dark:border-gray-700">
                <h4 className="font-medium text-gray-800 dark:text-white mb-3">
                  Session Status
                </h4>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {selectedExecution.sessions.map((session, index) => {
                    const device = devices.find(d => d.udid === session.deviceId);
                    return (
                      <div
                        key={index}
                        className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-xl">📱</span>
                          <div>
                            <p className="font-medium text-sm">
                              {device?.name || session.deviceId.substring(0, 16)}
                            </p>
                            {session.sessionId && (
                              <p className="text-xs text-gray-500">
                                Session: {session.sessionId.substring(0, 8)}...
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge size="sm" color={
                            session.status === 'completed' ? 'success' :
                            session.status === 'error' ? 'error' :
                            session.status === 'running' ? 'warning' :
                            'light'
                          }>
                            {session.status}
                          </Badge>
                          {session.sessionId && (
                            <a
                              href={`/sessions/${session.sessionId}`}
                              className="text-xs text-brand-500 hover:text-brand-600"
                            >
                              View Logs →
                            </a>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Timing */}
              <div className="border-t pt-4 text-sm text-gray-500 dark:text-gray-400 dark:border-gray-700">
                <p>Started: {selectedExecution.startTime.toLocaleString()}</p>
                {selectedExecution.endTime && (
                  <p>Completed: {selectedExecution.endTime.toLocaleString()}</p>
                )}
              </div>
            </div>
          </>
        )}
      </Modal>
    </div>
  );
};

export default BatchOperationsManager;
