///Users/tinder/Work/automation-bot-ui/src/components/automation/AutomationStart.tsx
"use client";
import React, { useState } from 'react';
import { apiService, Device, AutomationStartRequest, AutomationSession } from '@/services/api';
import DevicesList from '../devices/DevicesList';
import Button from '../ui/button/Button';
import Input from '../form/input/InputField';
import Label from '../form/Label';
import Select from '../form/Select';
import Checkbox from '../form/input/Checkbox';
import { ChevronDownIcon } from '@/icons';

interface AutomationStartProps {
  flow: 'tinder' | 'bumble' | 'bumblecontainer';
  onAutomationStarted?: (session: AutomationSession) => void;
}

const AutomationStart: React.FC<AutomationStartProps> = ({ flow, onAutomationStarted }) => {
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    checkpoint: 'deletePhotos',
    generateProfile: true,
    infinite: true,
    maxRuns: 99,
    maxConsecutiveErrors: 2,
    profileAge: 23,
    nameType: 'similar',
    nameVariant: 'Aurabel',
    waitTimeAfterCaptcha: 120000,
    photoCount: 6,
    dragDistanceSlider: true,
    totalAccountCreationTime: 1
  });

  const checkpointOptions = [
    { value: 'deletePhotos', label: 'Delete Photos' },
    { value: 'genderSelection', label: 'Gender Selection' },
    { value: 'lookingFor', label: 'Looking For' },
    { value: 'educationSkip', label: 'Education Skip' },
    { value: 'jobSkip', label: 'Job Skip' },
    { value: 'profileSetup', label: 'Profile Setup' },
    { value: 'swiping', label: 'Swiping' }
  ];

  const nameTypeOptions = [
    { value: 'similar', label: 'Similar' },
    { value: 'random', label: 'Random' },
    { value: 'custom', label: 'Custom' }
  ];

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleStartAutomation = async () => {
    if (!selectedDevice) {
      setError('Please select a device first');
      return;
    }

    setIsStarting(true);
    setError(null);
    setSuccess(null);

    try {
      const request: AutomationStartRequest = {
        udid: selectedDevice.udid,
        flow,
        checkpoint: formData.checkpoint,
        generateProfile: formData.generateProfile,
        infinite: formData.infinite,
        maxRuns: formData.maxRuns,
        maxConsecutiveErrors: formData.maxConsecutiveErrors,
        profileOptions: {
          age: formData.profileAge,
          nameType: formData.nameType,
          nameVariant: formData.nameVariant
        },
        params: {
          waitTimeAfterCaptcha: formData.waitTimeAfterCaptcha,
          photoCount: formData.photoCount,
          dragDistanceSlider: formData.dragDistanceSlider,
          totalAccountCreationTime: formData.totalAccountCreationTime
        }
      };

      const response = await apiService.startAutomation(request);
      
      setSuccess(`Automation started successfully! Session ID: ${response.session.id}`);
      
      if (onAutomationStarted) {
        onAutomationStarted(response.session);
      }

      // Reset selected device to allow starting another automation
      setSelectedDevice(null);
      
    } catch (err) {
      console.error('Error starting automation:', err);
      setError(err instanceof Error ? err.message : 'Failed to start automation');
    } finally {
      setIsStarting(false);
    }
  };

  const flowDisplayName = {
    tinder: 'Tinder',
    bumble: 'Bumble',
    bumblecontainer: 'Bumble Container'
  }[flow];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-semibold text-gray-800 dark:text-white/90">
          Start {flowDisplayName} Automation
        </h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Select a device and configure automation parameters
        </p>
      </div>

      {/* Error/Success Messages */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
          <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
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
            
            <div>
              <Label>Starting Checkpoint</Label>
              <div className="relative">
                <Select
                  options={checkpointOptions}
                  value={formData.checkpoint}
                  onChange={(value) => handleInputChange('checkpoint', value)}
                />
                <span className="absolute text-gray-500 -translate-y-1/2 pointer-events-none right-3 top-1/2 dark:text-gray-400">
                  <ChevronDownIcon />
                </span>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <Checkbox
                checked={formData.generateProfile}
                onChange={(checked) => handleInputChange('generateProfile', checked)}
                label="Generate Profile"
              />
              <Checkbox
                checked={formData.infinite}
                onChange={(checked) => handleInputChange('infinite', checked)}
                label="Infinite Mode"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Max Runs</Label>
                <Input
                  type="number"
                  value={formData.maxRuns}
                  onChange={(e) => handleInputChange('maxRuns', parseInt(e.target.value))}
                />
              </div>
              <div>
                <Label>Max Consecutive Errors</Label>
                <Input
                  type="number"
                  value={formData.maxConsecutiveErrors}
                  onChange={(e) => handleInputChange('maxConsecutiveErrors', parseInt(e.target.value))}
                />
              </div>
            </div>
          </div>

          {/* Profile Settings */}
          <div className="space-y-4">
            <h4 className="font-medium text-gray-800 dark:text-white/90">Profile Settings</h4>
            
            <div>
              <Label>Age</Label>
              <Input
                type="number"
                value={formData.profileAge}
                onChange={(e) => handleInputChange('profileAge', parseInt(e.target.value))}
              />
            </div>

            <div>
              <Label>Name Type</Label>
              <div className="relative">
                <Select
                  options={nameTypeOptions}
                  value={formData.nameType}
                  onChange={(value) => handleInputChange('nameType', value)}
                />
                <span className="absolute text-gray-500 -translate-y-1/2 pointer-events-none right-3 top-1/2 dark:text-gray-400">
                  <ChevronDownIcon />
                </span>
              </div>
            </div>

            <div>
              <Label>Name Variant</Label>
              <Input
                type="text"
                value={formData.nameVariant}
                onChange={(e) => handleInputChange('nameVariant', e.target.value)}
              />
            </div>
          </div>

          {/* Advanced Parameters */}
          <div className="space-y-4 lg:col-span-2">
            <h4 className="font-medium text-gray-800 dark:text-white/90">Advanced Parameters</h4>
            
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <Label>Wait Time After Captcha (ms)</Label>
                <Input
                  type="number"
                  value={formData.waitTimeAfterCaptcha}
                  onChange={(e) => handleInputChange('waitTimeAfterCaptcha', parseInt(e.target.value))}
                />
              </div>
              <div>
                <Label>Photo Count</Label>
                <Input
                  type="number"
                  value={formData.photoCount}
                  onChange={(e) => handleInputChange('photoCount', parseInt(e.target.value))}
                />
              </div>
              <div>
                <Label>Account Creation Time</Label>
                <Input
                  type="number"
                  value={formData.totalAccountCreationTime}
                  onChange={(e) => handleInputChange('totalAccountCreationTime', parseInt(e.target.value))}
                />
              </div>
              <div className="flex items-end">
                <Checkbox
                  checked={formData.dragDistanceSlider}
                  onChange={(checked) => handleInputChange('dragDistanceSlider', checked)}
                  label="Drag Distance Slider"
                />
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
          className="min-w-[200px]"
        >
          {isStarting 
            ? 'Starting...' 
            : `Start ${flowDisplayName} Automation`
          }
        </Button>
      </div>
    </div>
  );
};

export default AutomationStart;
