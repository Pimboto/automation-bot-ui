"use client";
import React, { useState, useEffect } from 'react';
import { useFlowConfig } from '@/hooks/useFlow';
import { Device, AutomationStartRequest, apiService, AutomationSession } from '@/services/api';
import DevicesList from '../devices/DevicesList';
import Button from '../ui/button/Button';
import Input from '../form/input/InputField';
import Label from '../form/Label';
import Select from '../form/Select';
import Checkbox from '../form/input/Checkbox';
import { Modal } from '../ui/modal';
import Badge from '../ui/badge/Badge';
import { useModal } from '@/hooks/useModal';
import { ChevronDownIcon } from '@/icons';

interface DynamicAutomationFormProps {
  flowName: string;
  onAutomationStarted?: (session: AutomationSession) => void;
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
    tipoProxy?: string;
    emailreal?: boolean;
  };
  params: Record<string, string | number | boolean>;
}

interface AutomationConfig {
  id: string;
  name: string;
  flowName: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  config: FormState;
}

// Name configuration based on your HTML example
const nameConfig = {
  similar: ["lola", "iris", "aura"],
  variation: ["Sanlola", "IrisBaker", "Aurabel"],
  phrase: ["Sanlola", "IrisBaker", "Aurabel"]
};

// Skeleton component for loading state
const FormSkeleton: React.FC = () => {
  return (
    <div className="space-y-6 animate-pulse">
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
      <div className="flex justify-end">
        <div className="h-11 bg-gray-200 rounded w-48 dark:bg-gray-700"></div>
      </div>
    </div>
  );
};

const STORAGE_KEY = 'automation_configurations';

const DynamicAutomationForm: React.FC<DynamicAutomationFormProps> = ({ 
  flowName, 
  onAutomationStarted 
}) => {
  const { flowConfig, isLoading, error } = useFlowConfig(flowName);
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Configuration management states
  const [configurations, setConfigurations] = useState<AutomationConfig[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedConfig, setSelectedConfig] = useState<AutomationConfig | null>(null);
  const [configName, setConfigName] = useState('');
  const [configDescription, setConfigDescription] = useState('');
  const [saveError, setSaveError] = useState<string | null>(null);
  
  // Modal states
  const saveModal = useModal();
  const deleteModal = useModal();
  const previewModal = useModal();
  
  // Form state initialized with default values
  const [formState, setFormState] = useState<FormState>({
    checkpoint: '',
    generateProfile: true,
    infinite: true,
    maxRuns: 100,
    maxConsecutiveErrors: 5,
    profileOptions: {
      age: 22,
      nameType: 'random',
      nameVariant: '',
      tipoProxy: 'residential',
      emailreal: false,
    },
    params: {},
  });

  // Update form state when flow config loads
  useEffect(() => {
    if (flowConfig?.defaultParams) {
      const defaults = flowConfig.defaultParams;
      setFormState(prev => ({
        ...prev,
        checkpoint: defaults.checkpoint || '',
        generateProfile: defaults.generateProfile ?? false,
        infinite: flowConfig.supportsInfiniteMode ? (defaults.infinite ?? true) : false,
        maxRuns: defaults.maxRuns ?? 100,
        maxConsecutiveErrors: defaults.maxConsecutiveErrors ?? 5,
        profileOptions: {
          age: defaults.profileOptions?.age ?? 22,
          nameType: defaults.profileOptions?.nameType ?? 'random',
          nameVariant: defaults.profileOptions?.nameVariant ?? '',
          tipoProxy: defaults.profileOptions?.tipoProxy ?? 'residential',
          emailreal: defaults.profileOptions?.emailreal ?? false,
        },
        params: { ...defaults.params || {} },
      }));
    }
  }, [flowConfig]);

  // Load configurations from localStorage
  useEffect(() => {
    loadConfigurations();
  }, []);

  const loadConfigurations = () => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const configs: AutomationConfig[] = JSON.parse(stored);
        setConfigurations(configs);
      }
    } catch (error) {
      console.error('Error loading configurations:', error);
    }
  };

  const saveConfigurations = (configs: AutomationConfig[]) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(configs));
      setConfigurations(configs);
    } catch (error) {
      console.error('Error saving configurations:', error);
    }
  };

  const handleInputChange = (field: keyof FormState, value: string | number | boolean) => {
    setFormState(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleParamChange = (paramKey: string, value: string | number | boolean) => {
    setFormState(prev => ({
      ...prev,
      params: {
        ...prev.params,
        [paramKey]: value,
      },
    }));
  };

  const handleProfileOptionChange = (option: keyof FormState['profileOptions'], value: string | number | boolean) => {
    setFormState(prev => ({
      ...prev,
      profileOptions: {
        ...prev.profileOptions,
        [option]: value,
      },
    }));
  };

  // Handle nameType change and reset nameVariant accordingly
  const handleNameTypeChange = (nameType: string) => {
    setFormState(prev => ({
      ...prev,
      profileOptions: {
        ...prev.profileOptions,
        nameType,
        nameVariant: nameType === 'random' ? '' : prev.profileOptions.nameVariant,
      },
    }));
  };

  // Handle loading configuration from ConfigurationManager
  const handleLoadConfiguration = (config: FormState) => {
    setFormState({...config}); // Force a new object reference
  };

  const handleSaveConfig = () => {
    setSaveError(null);
    
    if (!configName.trim()) {
      setSaveError('Configuration name is required');
      return;
    }

    // Check for duplicate names in the same flow
    const existingConfig = configurations.find(
      config => config.name.toLowerCase() === configName.toLowerCase() && config.flowName === flowName
    );

    if (existingConfig) {
      setSaveError('A configuration with this name already exists for this flow');
      return;
    }

    const newConfig: AutomationConfig = {
      id: Date.now().toString(),
      name: configName.trim(),
      flowName,
      description: configDescription.trim() || undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      config: { ...formState },
    };

    const updatedConfigs = [...configurations, newConfig];
    saveConfigurations(updatedConfigs);

    // Reset form
    setConfigName('');
    setConfigDescription('');
    saveModal.closeModal();
    
    // Show success message
    setSuccess('Configuration saved successfully!');
    setTimeout(() => setSuccess(null), 3000);
  };

  const handleDeleteConfig = () => {
    if (!selectedConfig) return;

    const updatedConfigs = configurations.filter(config => config.id !== selectedConfig.id);
    saveConfigurations(updatedConfigs);
    
    setSelectedConfig(null);
    deleteModal.closeModal();
  };

  const handleLoadConfig = (config: AutomationConfig) => {
    handleLoadConfiguration(config.config);
    setSelectedConfig(null);
    setSuccess('Configuration loaded successfully!');
    setTimeout(() => setSuccess(null), 3000);
  };

  const handlePreviewConfig = (config: AutomationConfig) => {
    setSelectedConfig(config);
    previewModal.openModal();
  };

  const confirmDelete = (config: AutomationConfig) => {
    setSelectedConfig(config);
    deleteModal.openModal();
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
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
      // Prepare the request with complete profileOptions
      const requestProfileOptions = formState.generateProfile ? {
        age: formState.profileOptions.age,
        nameType: formState.profileOptions.nameType,
        nameVariant: formState.profileOptions.nameVariant || undefined,
        ...(formState.profileOptions.tipoProxy && { tipoProxy: formState.profileOptions.tipoProxy }),
        ...(formState.profileOptions.emailreal !== undefined && { emailreal: formState.profileOptions.emailreal }),
      } : undefined;

      const request: AutomationStartRequest = {
        udid: selectedDevice.udid,
        flow: flowName,
        checkpoint: formState.checkpoint,
        generateProfile: formState.generateProfile,
        infinite: formState.infinite,
        maxRuns: formState.maxRuns,
        maxConsecutiveErrors: formState.maxConsecutiveErrors,
        ...(requestProfileOptions && { profileOptions: requestProfileOptions }),
        params: formState.params,
      };

      console.log('🚀 Starting automation with request:', JSON.stringify(request, null, 2));

      const response = await apiService.startAutomation(request);
      
      setSuccess(`✅ Automation started successfully! Session ID: ${response.session.id}`);
      
      if (onAutomationStarted) {
        onAutomationStarted(response.session);
      }

      setSelectedDevice(null);
      
    } catch (err) {
      console.error('❌ Error starting automation:', err);
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
            The automation flow `{flowName}` could not be found.
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

  // Check if flow supports profile generation
  const supportsProfileGeneration = flowConfig.defaultParams?.generateProfile !== undefined;

  // Get nameType options
  const nameTypeOptions = [
    { value: 'random', label: 'Random' },
    { value: 'similar', label: 'Similar' },
    { value: 'variation', label: 'Variation' },
    { value: 'phrase', label: 'Phrase' }
  ];

  // Get nameVariant options based on selected nameType
  const getNameVariantOptions = (nameType: string) => {
    if (nameType === 'random') return [];
    
    const options = [];
    
    if (nameType === 'variation' || nameType === 'phrase') {
      options.push({ value: '', label: '-- Default (Sanlola) --' });
    }
    
    if (nameConfig[nameType as keyof typeof nameConfig]) {
      nameConfig[nameType as keyof typeof nameConfig].forEach(option => {
        options.push({ value: option, label: option });
      });
    }
    
    return options;
  };

  const nameVariantOptions = getNameVariantOptions(formState.profileOptions.nameType);
  const showNameVariant = formState.profileOptions.nameType !== 'random';
  const nameVariantRequired = formState.profileOptions.nameType === 'similar';

  // Check if flow has specific profile options
  const hasProxyOption = flowConfig.defaultParams?.profileOptions?.tipoProxy !== undefined;
  const hasEmailRealOption = flowConfig.defaultParams?.profileOptions?.emailreal !== undefined;

  const proxyOptions = [
    { value: 'residential', label: 'Residential' },
    { value: 'mobile', label: 'Mobile' }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-semibold text-gray-800 dark:text-white/90 capitalize">
          Start {flowName} Automation
        </h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Select a device and configure automation parameters
        </p>
      </div>

      {/* Configuration Manager */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-lg font-medium text-gray-800 dark:text-white/90">
              1. Saved Configurations
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Save and manage your automation configurations for {flowName}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button size="sm" onClick={saveModal.openModal}>
              💾 Save Current
            </Button>
          </div>
        </div>

        {/* Search */}
        <div className="mt-4">
          <Input
            type="text"
            placeholder="Search configurations..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Configurations List */}
        <div className="mt-4 space-y-3">
          {configurations.filter(config => {
            const matchesFlow = config.flowName === flowName;
            const matchesSearch = config.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                 (config.description?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false);
            return matchesFlow && matchesSearch;
          }).length === 0 ? (
            <div className="text-center py-8">
              <div className="text-gray-400 text-4xl mb-2">📋</div>
              <p className="text-gray-500 dark:text-gray-400">
                {searchTerm ? 'No configurations match your search' : 'No saved configurations yet'}
              </p>
              <p className="text-sm text-gray-400 dark:text-gray-500">
                Save your current configuration to reuse it later
              </p>
            </div>
          ) : (
            configurations
              .filter(config => {
                const matchesFlow = config.flowName === flowName;
                const matchesSearch = config.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                     (config.description?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false);
                return matchesFlow && matchesSearch;
              })
              .map((config) => (
                <div
                  key={config.id}
                  className="flex items-center justify-between rounded-lg border border-gray-200 p-4 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-white/[0.02]"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium text-gray-800 dark:text-white/90">
                        {config.name}
                      </h4>
                      <Badge size="sm" color="info">
                        {config.flowName}
                      </Badge>
                    </div>
                    {config.description && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                        {config.description}
                      </p>
                    )}
                    <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                      <span>Created: {formatDate(config.createdAt)}</span>
                      <span>•</span>
                      <span>Checkpoint: {config.config.checkpoint}</span>
                      <span>•</span>
                      <span>Max Runs: {config.config.maxRuns}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handlePreviewConfig(config)}
                      className="rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
                    >
                      👁️ Preview
                    </button>
                    <button
                      onClick={() => handleLoadConfig(config)}
                      className="rounded-lg bg-brand-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-600"
                    >
                      📥 Load
                    </button>
                    <button
                      onClick={() => confirmDelete(config)}
                      className="rounded-lg bg-red-100 p-1.5 text-red-600 hover:bg-red-200 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/40"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              ))
          )}
        </div>
      </div>

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
                  value={formState.checkpoint}
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
              {supportsProfileGeneration && (
                <Checkbox
                  checked={formState.generateProfile}
                  onChange={(checked) => handleInputChange('generateProfile', checked)}
                  label="Generate Profile"
                />
              )}
              
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
              {flowConfig.supportsInfiniteMode && (
                <div>
                  <Label>Max Runs</Label>
                  <Input
                    type="number"
                    value={formState.maxRuns.toString()}
                    onChange={(e) => handleInputChange('maxRuns', parseInt(e.target.value) || 0)}
                  />
                </div>
              )}
              <div>
                <Label>Max Consecutive Errors</Label>
                <Input
                  type="number"
                  value={formState.maxConsecutiveErrors.toString()}
                  onChange={(e) => handleInputChange('maxConsecutiveErrors', parseInt(e.target.value) || 0)}
                />
              </div>
            </div>
          </div>

          {/* Profile Generation Settings */}
          <div className="space-y-4">
            {supportsProfileGeneration && formState.generateProfile ? (
              <>
                <h4 className="font-medium text-gray-800 dark:text-white/90">Profile Generation</h4>
                
                <div>
                  <Label>Age</Label>
                  <Input
                    type="number"
                    value={formState.profileOptions.age.toString()}
                    min="18"
                    max="80"
                    onChange={(e) => handleProfileOptionChange('age', parseInt(e.target.value) || 18)}
                  />
                </div>
                
                <div>
                  <Label>Name Type *</Label>
                  <div className="relative">
                    <Select
                      options={nameTypeOptions}
                      value={formState.profileOptions.nameType}
                      onChange={handleNameTypeChange}
                    />
                    <span className="absolute text-gray-500 -translate-y-1/2 pointer-events-none right-3 top-1/2 dark:text-gray-400">
                      <ChevronDownIcon />
                    </span>
                  </div>
                </div>
                
                {showNameVariant && (
                  <div>
                    <Label>
                      Name Variant {nameVariantRequired && '*'}
                      <span className="ml-1 text-xs text-gray-500 dark:text-gray-400">
                        {nameVariantRequired ? 'Required' : 'Optional - defaults to Sanlola'}
                      </span>
                    </Label>
                    <div className="relative">
                      <Select
                        options={nameVariantOptions}
                        value={formState.profileOptions.nameVariant}
                        onChange={(value) => handleProfileOptionChange('nameVariant', value)}
                        placeholder={nameVariantRequired ? 'Select variant' : 'Default (Sanlola)'}
                      />
                      <span className="absolute text-gray-500 -translate-y-1/2 pointer-events-none right-3 top-1/2 dark:text-gray-400">
                        <ChevronDownIcon />
                      </span>
                    </div>
                  </div>
                )}

                {hasProxyOption && (
                  <div>
                    <Label>Proxy Type</Label>
                    <div className="relative">
                      <Select
                        options={proxyOptions}
                        value={formState.profileOptions.tipoProxy ?? 'residential'}
                        onChange={(value) => handleProfileOptionChange('tipoProxy', value)}
                      />
                      <span className="absolute text-gray-500 -translate-y-1/2 pointer-events-none right-3 top-1/2 dark:text-gray-400">
                        <ChevronDownIcon />
                      </span>
                    </div>
                  </div>
                )}

                {hasEmailRealOption && (
                  <div>
                    <Checkbox
                      checked={formState.profileOptions.emailreal || false}
                      onChange={(checked) => handleProfileOptionChange('emailreal', checked)}
                      label="Use Real Email"
                    />
                  </div>
                )}
              </>
            ) : (
              <div className="flex items-center justify-center h-32 text-gray-500 dark:text-gray-400">
                <p className="text-sm">No additional parameters for this section</p>
              </div>
            )}
          </div>
        </div>

        {/* Additional Parameters Section */}
        {Object.keys(formState.params).length > 0 && (
          <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
            <h4 className="mb-4 font-medium text-gray-800 dark:text-white/90">Flow Parameters</h4>
            
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Object.entries(formState.params).map(([key, value]) => (
                <div key={key}>
                  <Label>{key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}</Label>
                  {typeof value === 'boolean' ? (
                    <div className="mt-1">
                      <Checkbox
                        checked={value}
                        onChange={(checked) => handleParamChange(key, checked)}
                        label={value ? 'Enabled' : 'Disabled'}
                      />
                    </div>
                  ) : typeof value === 'number' ? (
                    <Input
                      type="number"
                      value={value.toString()}
                      onChange={(e) => handleParamChange(key, parseInt(e.target.value) || 0)}
                    />
                  ) : (
                    <Input
                      type="text"
                      value={value?.toString() ?? ''}
                      onChange={(e) => handleParamChange(key, e.target.value)}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Start Button and Debug Info */}
      <div className="space-y-4">
        {/* Debug Request Preview */}
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900">
          <details className="cursor-pointer">
            <summary className="text-sm font-medium text-gray-700 dark:text-gray-300">
              🔍 Preview Request Data (Click to expand)
            </summary>
            <div className="mt-3 max-h-64 overflow-y-auto rounded-md bg-white p-3 dark:bg-gray-800">
              <pre className="text-xs text-gray-600 dark:text-gray-300">
                {JSON.stringify({
                  udid: selectedDevice?.udid ?? 'No device selected',
                  flow: flowName,
                  checkpoint: formState.checkpoint,
                  generateProfile: formState.generateProfile,
                  infinite: formState.infinite,
                  maxRuns: formState.maxRuns,
                  maxConsecutiveErrors: formState.maxConsecutiveErrors,
                  ...(formState.generateProfile && {
                    profileOptions: {
                      age: formState.profileOptions.age,
                      nameType: formState.profileOptions.nameType,
                      nameVariant: formState.profileOptions.nameVariant || undefined,
                      ...(formState.profileOptions.tipoProxy && { tipoProxy: formState.profileOptions.tipoProxy }),
                      ...(formState.profileOptions.emailreal !== undefined && { emailreal: formState.profileOptions.emailreal }),
                    }
                  }),
                  params: formState.params,
                }, null, 2)}
              </pre>
            </div>
          </details>
        </div>

        {/* Start Button */}
        <div className="flex justify-end">
          <Button
            onClick={handleStartAutomation}
            disabled={!selectedDevice || isStarting || (nameVariantRequired && !formState.profileOptions.nameVariant)}
            className="min-w-[200px] capitalize"
          >
            {isStarting 
              ? '⏳ Starting...' 
              : `🚀 Start ${flowName} Automation`
            }
          </Button>
        </div>
      </div>

      {/* Modals */}
      {/* Save Configuration Modal */}
      <Modal
        isOpen={saveModal.isOpen}
        onClose={saveModal.closeModal}
        className="max-w-md p-6"
      >
        <h3 className="mb-4 text-lg font-medium text-gray-800 dark:text-white/90">
          💾 Save Configuration
        </h3>

        <div className="space-y-4">
          <div>
            <Label>Configuration Name *</Label>
            <Input
              type="text"
              value={configName}
              onChange={(e) => setConfigName(e.target.value)}
              placeholder="e.g., Tinder Quick Setup"
            />
          </div>

          <div>
            <Label>Description (Optional)</Label>
            <Input
              type="text"
              value={configDescription}
              onChange={(e) => setConfigDescription(e.target.value)}
              placeholder="Brief description of this configuration"
            />
          </div>

          {saveError && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-800 dark:bg-red-900/20">
              <p className="text-sm text-red-700 dark:text-red-300">{saveError}</p>
            </div>
          )}

          <div className="flex justify-end gap-3">
            <Button size="sm" variant="outline" onClick={saveModal.closeModal}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleSaveConfig}>
              💾 Save Configuration
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={deleteModal.isOpen}
        onClose={deleteModal.closeModal}
        className="max-w-md p-6"
      >
        <h3 className="mb-4 text-lg font-medium text-gray-800 dark:text-white/90">
          🗑️ Delete Configuration
        </h3>
        
        <p className="mb-6 text-sm text-gray-600 dark:text-gray-400">
          Are you sure you want to delete `{selectedConfig?.name}`? This action cannot be undone.
        </p>

        <div className="flex justify-end gap-3">
          <Button size="sm" variant="outline" onClick={deleteModal.closeModal}>
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleDeleteConfig}
            className="bg-red-500 hover:bg-red-600"
          >
            🗑️ Delete
          </Button>
        </div>
      </Modal>

      {/* Preview Configuration Modal */}
      <Modal
        isOpen={previewModal.isOpen}
        onClose={previewModal.closeModal}
        className="max-w-2xl p-6"
      >
        {selectedConfig && (
          <>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-800 dark:text-white/90">
                👁️ Configuration Preview
              </h3>
              <Badge size="sm" color="info">
                {selectedConfig.flowName}
              </Badge>
            </div>

            <div className="mb-4">
              <h4 className="font-medium text-gray-800 dark:text-white/90">
                {selectedConfig.name}
              </h4>
              {selectedConfig.description && (
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {selectedConfig.description}
                </p>
              )}
            </div>

            <div className="max-h-96 overflow-y-auto rounded-lg bg-gray-50 p-4 dark:bg-gray-900">
              <pre className="text-sm">
                {JSON.stringify(selectedConfig.config, null, 2)}
              </pre>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <Button size="sm" variant="outline" onClick={previewModal.closeModal}>
                Close
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  handleLoadConfig(selectedConfig);
                  previewModal.closeModal();
                }}
              >
                📥 Load This Configuration
              </Button>
            </div>
          </>
        )}
      </Modal>
    </div>
  );
};

export default DynamicAutomationForm;
