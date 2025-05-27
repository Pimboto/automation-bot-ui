"use client";
import React, { useState, useEffect } from 'react';
import { useFlowConfig } from '@/hooks/useFlow';
import { Device, AutomationStartRequest, apiService } from '@/services/api';
import DevicesList from '../devices/DevicesList';
import Button from '../ui/button/Button';
import Input from '../form/input/InputField';
import Label from '../form/Label';
import Select from '../form/Select';
import Checkbox from '../form/input/Checkbox';
import { ChevronDownIcon } from '@/icons';

interface DynamicAutomationFormProps {
  flowName: string;
  onAutomationStarted?: (session: any) => void;
}

interface FormState {
  checkpoint: string;
  generateProfile: boolean;
  infinite: boolean;
  maxRuns: number;
  maxConsecutiveErrors: number;
  profileOptions: {
    age: number;
    nameType: string;
    nameVariant: string;
  };
  params: Record<string, any>;
}

// Skeleton component for loading state
const FormSkeleton: React.FC = () => {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Device Selection Skeleton */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] sm:p-6">
        <div className="h-6 bg-gray-200 rounded w-32 mb-4 dark:bg-gray-700"></div>
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex items-center gap-3 p-3 border rounded-lg">
              <div className="h-8 w-8 bg-gray-200 rounded dark:bg-gray-700"></div>
              <div className="flex-1">
                <div className="h-4 bg-gray-200 rounded w-24 mb-1 dark:bg-gray-700"></div>
                <div className="h-3 bg-gray-200 rounded w-32 dark:bg-gray-700"></div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Configuration Form Skeleton */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] sm:p-6">
        <div className="h-6 bg-gray-200 rounded w-40 mb-6 dark:bg-gray-700"></div>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="space-y-4">
              <div className="h-4 bg-gray-200 rounded w-24 dark:bg-gray-700"></div>
              <div className="h-11 bg-gray-200 rounded dark:bg-gray-700"></div>
            </div>
          ))}
        </div>
      </div>

      {/* Button Skeleton */}
      <div className="flex justify-end">
        <div className="h-11 bg-gray-200 rounded w-48 dark:bg-gray-700"></div>
      </div>
    </div>
  );
};

const DynamicAutomationForm: React.FC<DynamicAutomationFormProps> = ({ 
  flowName, 
  onAutomationStarted 
}) => {
  const { flowConfig, isLoading, error } = useFlowConfig(flowName);
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Form state initialized with default values
  const [formState, setFormState] = useState<FormState>({
    checkpoint: '',
    generateProfile: true,
    infinite: true,
    maxRuns: 100,
    maxConsecutiveErrors: 5,
    profileOptions: {
      age: 23,
      nameType: 'similar',
      nameVariant: 'Aurabel',
    },
    params: {},
  });

  // Update form state when flow config loads
  useEffect(() => {
    if (flowConfig?.defaultParams) {
      const defaults = flowConfig.defaultParams;
      setFormState(prev => ({
        ...prev,
        checkpoint: defaults.checkpoint || prev.checkpoint,
        generateProfile: defaults.generateProfile ?? prev.generateProfile,
        infinite: flowConfig.supportsInfiniteMode ? (defaults.infinite ?? prev.infinite) : false,
        maxRuns: defaults.maxRuns ?? prev.maxRuns,
        maxConsecutiveErrors: defaults.maxConsecutiveErrors ?? prev.maxConsecutiveErrors,
        params: { ...prev.params, ...defaults.params },
      }));
    }
  }, [flowConfig]);

  const handleInputChange = (field: keyof FormState, value: any) => {
    setFormState(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleParamChange = (paramKey: string, value: any) => {
    setFormState(prev => ({
      ...prev,
      params: {
        ...prev.params,
        [paramKey]: value,
      },
    }));
  };

  const handleProfileOptionChange = (option: keyof FormState['profileOptions'], value: any) => {
    setFormState(prev => ({
      ...prev,
      profileOptions: {
        ...prev.profileOptions,
        [option]: value,
      },
    }));
  };

  const handleStartAutomation = async () => {
    if (!selectedDevice || !flowConfig) {
      setStartError('Please select a device first');
      return;
    }

    setIsStarting(true);
    setStartError(null);
    setSuccess(null);

    try {
      const request: AutomationStartRequest = {
        udid: selectedDevice.udid,
        flow: flowName,
        checkpoint: formState.checkpoint,
        generateProfile: formState.generateProfile,
        infinite: formState.infinite,
        maxRuns: formState.maxRuns,
        maxConsecutiveErrors: formState.maxConsecutiveErrors,
        profileOptions: formState.profileOptions,
        params: formState.params,
      };

      const response = await apiService.startAutomation(request);
      
      setSuccess(`Automation started successfully! Session ID: ${response.session.id}`);
      
      if (onAutomationStarted) {
        onAutomationStarted(response.session);
      }

      // Reset selected device
      setSelectedDevice(null);
      
    } catch (err) {
      console.error('Error starting automation:', err);
      setStartError(err instanceof Error ? err.message : 'Failed to start automation');
    } finally {
      setIsStarting(false);
    }
  };

  // Show skeleton while loading
  if (isLoading) {
    return <FormSkeleton />;
  }

  // Show error if failed to load
  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
        <div className="flex items-center gap-3">
          <div className="h-5 w-5 rounded-full bg-red-500" />
          <div>
            <h3 className="text-sm font-medium text-red-800 dark:text-red-200">
              Failed to Load Flow Configuration
            </h3>
            <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  // Show message if flow not found
  if (!flowConfig) {
    return (
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-900/20">
        <div className="text-center">
          <h3 className="text-lg font-medium text-gray-800 dark:text-white/90">
            Flow Not Found
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            The automation flow "{flowName}" could not be found.
          </p>
        </div>
      </div>
    );
  }

  // Show unavailable message
  if (!flowConfig.available) {
    return (
      <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 dark:border-yellow-800 dark:bg-yellow-900/20">
        <div className="flex items-center gap-3">
          <div className="h-5 w-5 rounded-full bg-yellow-500" />
          <div>
            <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
              Flow Temporarily Unavailable
            </h3>
            <p className="text-sm text-yellow-700 dark:text-yellow-300">
              The {flowName} automation flow is currently unavailable. Please try again later.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Prepare checkpoint options
  const checkpointOptions = flowConfig.checkpoints.map(checkpoint => ({
    value: checkpoint.name,
    label: checkpoint.name.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()),
  }));

  return (
    <div className="space-y-6">
      {/* Header */}


      {/* Error/Success Messages */}
      {startError && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
          <p className="text-sm text-red-700 dark:text-red-300">{startError}</p>
        </div>
      )}

      {success && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-900/20">
          <p className="text-sm text-green-700 dark:text-green-300">{success}</p>
        </div>
      )}

      {/* Device Selection */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] sm:p-6">
        <h3 className="mb-4 text-lg font-medium text-gray-800 dark:text-white/90">
          1. Select Device
        </h3>
        <DevicesList 
          onDeviceSelect={setSelectedDevice}
          selectedDevice={selectedDevice}
          showActions={true}
        />
      </div>

      {/* Configuration Form */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] sm:p-6">
        <h3 className="mb-6 text-lg font-medium text-gray-800 dark:text-white/90">
          2. Configure Automation
        </h3>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Basic Settings */}
          <div className="space-y-4">
            <h4 className="font-medium text-gray-800 dark:text-white/90">Basic Settings</h4>
            
            {/* Checkpoint Selection */}
            <div>
              <Label>Starting Checkpoint</Label>
              <div className="relative">
                <Select
                  options={checkpointOptions}
                  defaultValue={formState.checkpoint}
                  onChange={(value) => handleInputChange('checkpoint', value)}
                  placeholder="Select checkpoint"
                />
                <span className="absolute text-gray-500 -translate-y-1/2 pointer-events-none right-3 top-1/2 dark:text-gray-400">
                  <ChevronDownIcon />
                </span>
              </div>
            </div>

            {/* Boolean Options */}
            <div className="space-y-3">
              <Checkbox
                checked={formState.generateProfile}
                onChange={(checked) => handleInputChange('generateProfile', checked)}
                label="Generate Profile"
              />
              
              {flowConfig.supportsInfiniteMode && (
                <Checkbox
                  checked={formState.infinite}
                  onChange={(checked) => handleInputChange('infinite', checked)}
                  label="Infinite Mode"
                />
              )}
            </div>

            {/* Numeric Settings */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Max Runs</Label>
                <Input
                  type="number"
                  defaultValue={formState.maxRuns}
                  onChange={(e) => handleInputChange('maxRuns', parseInt(e.target.value) || 0)}
                />
              </div>
              <div>
                <Label>Max Consecutive Errors</Label>
                <Input
                  type="number"
                  defaultValue={formState.maxConsecutiveErrors}
                  onChange={(e) => handleInputChange('maxConsecutiveErrors', parseInt(e.target.value) || 0)}
                />
              </div>
            </div>
          </div>

          {/* Dynamic Parameters */}
          <div className="space-y-4">
            <h4 className="font-medium text-gray-800 dark:text-white/90">Parameters</h4>
            
            {/* Render dynamic parameters */}
            {Object.entries(formState.params).map(([key, value]) => (
              <div key={key}>
                <Label>{key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}</Label>
                {typeof value === 'boolean' ? (
                  <Checkbox
                    checked={value}
                    onChange={(checked) => handleParamChange(key, checked)}
                    label=""
                  />
                ) : typeof value === 'number' ? (
                  <Input
                    type="number"
                    defaultValue={value}
                    onChange={(e) => handleParamChange(key, parseInt(e.target.value) || 0)}
                  />
                ) : (
                  <Input
                    type="text"
                    defaultValue={value?.toString() ?? ''}
                    onChange={(e) => handleParamChange(key, e.target.value)}
                  />
                )}
              </div>
            ))}

            {/* Profile Options */}
            <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
              <h5 className="mb-3 font-medium text-gray-800 dark:text-white/90">Profile Options</h5>
              
              <div className="space-y-3">
                <div>
                  <Label>Age</Label>
                  <Input
                    type="number"
                    defaultValue={formState.profileOptions.age}
                    onChange={(e) => handleProfileOptionChange('age', parseInt(e.target.value) || 0)}
                  />
                </div>
                
                <div>
                  <Label>Name Type</Label>
                  <Input
                    type="text"
                    defaultValue={formState.profileOptions.nameType}
                    onChange={(e) => handleProfileOptionChange('nameType', e.target.value)}
                  />
                </div>
                
                <div>
                  <Label>Name Variant</Label>
                  <Input
                    type="text"
                    defaultValue={formState.profileOptions.nameVariant}
                    onChange={(e) => handleProfileOptionChange('nameVariant', e.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Start Button */}
      <div className="flex justify-end">
        <Button
          onClick={handleStartAutomation}
          disabled={!selectedDevice || isStarting}
          className="min-w-[200px] capitalize"
        >
          {isStarting 
            ? 'Starting...' 
            : `Start ${flowName} Automation`
          }
        </Button>
      </div>
    </div>
  );
};

export default DynamicAutomationForm;
