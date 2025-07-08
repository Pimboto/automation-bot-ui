// /Users/tinder/Work/automation-bot-ui/src/services/api.ts

// Raw API response types
interface RawApiResponse<T> {
  status: string;
  requestId?: string;
  data?: T;
  count?: number;
  stats?: {
    totalDevices?: number;
    connectedDevices?: number;
    availableDevices?: number;
    reservedDevices?: number;
  };
  timestamp?: string;
  message?: string;
  // For legacy compatibility
  devices?: RawDevice[];
  flows?: RawFlow[];
  sessions?: AutomationSession[];
  logs?: AutomationLog[];
  servers?: AppiumServer[];
  metrics?: MetricsResponse['metrics'];
  device?: RawDevice;
  flow?: RawFlow;
  session?: AutomationSession;
  server?: AppiumServer;
}

interface RawDevice {
  udid: string;
  name: string;
  version: string | null;
  model?: string;
  state?: string;
  connected?: boolean;
  available?: boolean;
  isAvailable?: boolean;
  lastDetected?: string;
  lastSeen?: string;
  firstSeen?: string;
  deviceId?: number;
  inUseBy?: string | null;
}

interface RawFlow {
  name: string;
  supportsInfiniteMode?: boolean;
  supportsInfinite?: boolean;
  available?: boolean;
  description?: string;
  checkpoints?: FlowCheckpoint[];
  defaultParams?: FlowConfig['defaultParams'];
}

export interface Device {
  udid: string;
  name: string;
  version: string | null;
  model?: string;
  state?: string;
  connected?: boolean;
  available?: boolean;
  isAvailable?: boolean; // For compatibility
  lastDetected?: string; // For compatibility
  lastSeen?: string;
  firstSeen?: string;
  deviceId?: number;
  inUseBy?: string | null;
}

export interface DevicesResponse {
  status: string;
  count: number;
  devices: Device[];
}

export interface DeviceResponse {
  status: string;
  device: Device;
}

// Flow Configuration Types (NUEVOS)
export interface FlowCheckpoint {
  name: string;
}

export interface FlowConfig {
  name: string;
  supportsInfiniteMode?: boolean;
  supportsInfinite?: boolean; // Alternative field name
  available?: boolean;
  description?: string;
  checkpoints?: FlowCheckpoint[];
  defaultParams?: {
    checkpoint?: string;
    generateProfile?: boolean;
    infinite?: boolean;
    maxRuns?: number;
    maxConsecutiveErrors?: number;
    profileOptions?: {
      age?: number;
      nameType?: string;
      nameVariant?: string;
      tipoProxy?: string;  // ADDED
      emailreal?: boolean; // ADDED
      proxyProfile?: string; // ADDED
    };
    params?: Record<string, string | number | boolean>;
  };
}

export interface FlowsResponse {
  status: string;
  count: number;
  flows: FlowConfig[];
}

// Automation Types
export interface AutomationSession {
  id: string;
  udid?: string;
  deviceInfo?: Device;
  device?: {
    name: string;
    udid: string;
    version: string;
    isAvailable: boolean;
    lastDetected: string;
  };
  appiumPort?: number;
  status: 'initializing' | 'running' | 'completed' | 'error' | 'stopped';
  flow: string;
  checkpoint: string;
  startTime?: string;
  endTime?: string;
  error?: string | null;
  result?: unknown;
  infinite: boolean;
  runCount?: number;
  maxRuns: number;
  profileGenerated?: boolean;
  profileOptions?: {
    age?: number;
    nameType?: string;
    nameVariant?: string;
    tipoProxy?: string;  // ADDED
    emailreal?: boolean; // ADDED
    proxyProfile?: string; // ADDED
  };
}

export interface AutomationStartRequest {
  udid: string;
  flow: string; // Cambiado para ser más flexible
  checkpoint: string;
  generateProfile?: boolean;
  infinite?: boolean;
  maxRuns?: number;
  maxConsecutiveErrors?: number;
  profileOptions?: {
    age?: number;
    nameType?: string;
    nameVariant?: string;
    tipoProxy?: string;  // ADDED - This was missing
    emailreal?: boolean; // ADDED - This was missing
    proxyProfile?: string; // ADDED
  };
  params?: Record<string, string | number | boolean>;
}

export interface AutomationStartResponse {
  status: string;
  message: string;
  session: AutomationSession;
}

export interface AutomationStatusResponse {
  status: string;
  session: AutomationSession;
}

export interface AutomationLog {
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  data: Record<string, unknown>;
}

export interface AutomationLogsResponse {
  status: string;
  count: number;
  logs: AutomationLog[];
}

// Appium Types
export interface AppiumServer {
  udid: string;
  appiumPort?: number;
  appium?: number;
  wdaPort?: number;
  wda?: number;
  mjpegPort?: number;
  mjpeg?: number;
  uptime: number;
}

export interface AppiumServersResponse {
  status: string;
  count: number;
  servers: AppiumServer[];
}

export interface AppiumServerResponse {
  status: string;
  server: AppiumServer;
}

// Health Check Types
export interface HealthResponse {
  status: string;
  version: string;
  timestamp: string;
}

// API Response Types
export interface SystemMetrics {
  startTime: string;
  uptime: number;
  cpu: {
    usage: string;
    count: number;
  };
  memory: {
    total: number;
    free: number;
    used: number;
    usedPercent: string;
  };
  loadAverage: number[];
}

export interface ApiMetrics {
  requestCount: number;
  errorCount: number;
  avgResponseTime: number;
  responseTimeSum: number;
  responseTimes: number[];
  requestsPerEndpoint: Record<string, number>;
  errorsPerEndpoint: Record<string, number>;
  statusCodes: Record<string, number>;
}

export interface AutomationMetrics {
  totalSessions: number;
  activeSessions: number;
  completedSessions: number;
  errorSessions: number;
  totalSwipes: number;
  totalLikes: number;
  totalNopes: number;
  totalMatches: number;
  avgSwipesPerSession: number;
  avgMatchesPerSession: number;
  swipesPerMinute: number;
  successRate: number;
  checkpointSuccessRates: Record<string, number>;
}

export interface DeviceMetrics {
  total: number;
  available: number;
  inUse: number;
  disconnected: number;
  usageByDevice: Record<string, number>;
}

export interface AppiumMetrics {
  activeServers: number;
  serverStartCount: number;
  serverErrorCount: number;
  avgStartupTime: number;
  startupTimeSum: number;
  startupTimes: number[];
}

export interface MetricsResponse {
  status: string;
  metrics: {
    system: SystemMetrics;
    api: ApiMetrics;
    automation: AutomationMetrics;
    device: DeviceMetrics;
    appium: AppiumMetrics;
  };
}

export interface AutomationSessionsResponse {
  status: string;
  sessions: AutomationSession[];
}


class ApiService {
  private readonly baseURL: string;
  private readonly token: string;

  constructor() {
    this.baseURL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';
    this.token = process.env.API_TOKEN ?? 'elmango10';
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    
    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.token}`,
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error(`API request failed for ${endpoint}:`, error);
      throw error;
    }
  }

  // Transform raw device to expected format
  private transformDevice(rawDevice: RawDevice): Device {
    return {
      ...rawDevice,
      isAvailable: rawDevice.available ?? rawDevice.isAvailable ?? false,
      lastDetected: rawDevice.lastSeen || rawDevice.lastDetected || new Date().toISOString(),
      version: rawDevice.version || 'Unknown',
    };
  }

  // Transform raw flow to expected format
  private transformFlow(rawFlow: RawFlow): FlowConfig {
    return {
      ...rawFlow,
      supportsInfiniteMode: rawFlow.supportsInfinite ?? rawFlow.supportsInfiniteMode ?? false,
      available: rawFlow.available ?? true,
      checkpoints: rawFlow.checkpoints || [],
      defaultParams: rawFlow.defaultParams || {},
    };
  }

  // Get system metrics
  async getMetrics(): Promise<MetricsResponse> {
    const response = await this.request<RawApiResponse<MetricsResponse['metrics']>>('/api/metrics');
    // Check if metrics are nested in data field or directly in response
    return {
      status: response.status,
      metrics: response.data || response.metrics || {
        system: {} as SystemMetrics,
        api: {} as ApiMetrics,
        automation: {} as AutomationMetrics,
        device: {} as DeviceMetrics,
        appium: {} as AppiumMetrics
      }
    };
  }

  // Health check
  async getHealth(): Promise<HealthResponse> {
    return this.request<HealthResponse>('/api/health');
  }

  // Device endpoints
  async getDevices(): Promise<DevicesResponse> {
    const response = await this.request<RawApiResponse<RawDevice[]>>('/api/devices');
    // Transform the response to match expected format
    const rawDevices = response.data || response.devices || [];
    const devices = rawDevices.map(device => this.transformDevice(device));
    
    return {
      status: response.status,
      count: response.count || devices.length,
      devices
    };
  }

  async getAvailableDevices(): Promise<DevicesResponse> {
    const response = await this.request<RawApiResponse<RawDevice[]>>('/api/devices/available');
    // Transform the response to match expected format
    const rawDevices = response.data || response.devices || [];
    const devices = rawDevices.map(device => this.transformDevice(device));
    
    return {
      status: response.status,
      count: response.count || devices.length,
      devices
    };
  }

  async getDevice(udid: string): Promise<DeviceResponse> {
    const response = await this.request<RawApiResponse<RawDevice>>(`/api/devices/${udid}`);
    // Transform the response to match expected format
    const rawDevice = response.data || response.device;
    const device = rawDevice ? this.transformDevice(rawDevice) : {} as Device;
    
    return {
      status: response.status,
      device
    };
  }

  // Flow configuration endpoints (NUEVOS)
  async getAutomationFlows(): Promise<FlowsResponse> {
    const response = await this.request<RawApiResponse<RawFlow[]>>('/api/automation/flows');
    // Transform the response to match expected format
    const rawFlows = response.data || response.flows || [];
    const flows = rawFlows.map(flow => this.transformFlow(flow));
    
    return {
      status: response.status,
      count: response.count || flows.length,
      flows
    };
  }

  async getFlowConfig(flowName: string): Promise<{ status: string; flow: FlowConfig }> {
    const response = await this.request<RawApiResponse<RawFlow>>(`/api/automation/flows/${flowName}`);
    // Transform the response to match expected format
    const rawFlow = response.data || response.flow;
    const flow = rawFlow ? this.transformFlow(rawFlow) : {} as FlowConfig;
    
    return {
      status: response.status,
      flow
    };
  }

  // Automation endpoints
  async startAutomation(request: AutomationStartRequest): Promise<AutomationStartResponse> {
    const response = await this.request<RawApiResponse<AutomationSession>>('/api/automation/start', {
      method: 'POST',
      body: JSON.stringify(request),
    });
    return {
      status: response.status,
      message: response.message || 'Automation started',
      session: response.data || response.session || {} as AutomationSession
    };
  }

  async getAutomationStatus(sessionId: string): Promise<AutomationStatusResponse> {
    const response = await this.request<RawApiResponse<AutomationSession>>(`/api/automation/${sessionId}/status`);
    return {
      status: response.status,
      session: response.data || response.session || {} as AutomationSession
    };
  }

  async getAutomationSessions(): Promise<AutomationSessionsResponse> {
    const response = await this.request<RawApiResponse<AutomationSession[]>>('/api/automation');
    // Transform the response to match expected format
    return {
      status: response.status,
      sessions: response.data || response.sessions || []
    };
  }

  async getAutomationLogs(
    sessionId: string,
    limit: number = 50,
    level?: 'info' | 'warn' | 'error' | 'debug'
  ): Promise<AutomationLogsResponse> {
    const params = new URLSearchParams({ limit: limit.toString() });
    if (level) params.append('level', level);
    
    const response = await this.request<RawApiResponse<AutomationLog[]>>(
      `/api/automation/${sessionId}/logs?${params.toString()}`
    );
    
    return {
      status: response.status,
      count: response.count || response.data?.length || response.logs?.length || 0,
      logs: response.data || response.logs || []
    };
  }

  async stopAutomation(sessionId: string): Promise<{ status: string; message: string }> {
    const response = await this.request<RawApiResponse<{ message?: string }>>(`/api/automation/${sessionId}/stop`, {
      method: 'POST',
    });
    return {
      status: response.status,
      message: response.message || response.data?.message || 'Automation stopped'
    };
  }

  // Appium server endpoints
  async getAppiumServers(): Promise<AppiumServersResponse> {
    const response = await this.request<RawApiResponse<AppiumServer[]>>('/api/appium/servers');
    // Transform the response to match expected format
    return {
      status: response.status,
      count: response.count || response.data?.length || response.servers?.length || 0,
      servers: response.data || response.servers || []
    };
  }

  async getAppiumServer(udid: string): Promise<AppiumServerResponse> {
    const response = await this.request<RawApiResponse<AppiumServer>>(`/api/appium/servers/${udid}`);
    return {
      status: response.status,
      server: response.data || response.server || {} as AppiumServer
    };
  }

  // Helper methods for specific metric categories
  async getSystemMetrics(): Promise<SystemMetrics> {
    const response = await this.getMetrics();
    return response.metrics.system;
  }

  async getAutomationMetrics(): Promise<AutomationMetrics> {
    const response = await this.getMetrics();
    return response.metrics.automation;
  }

  async getDeviceMetrics(): Promise<DeviceMetrics> {
    const response = await this.getMetrics();
    return response.metrics.device;
  }

  async getApiMetrics(): Promise<ApiMetrics> {
    const response = await this.getMetrics();
    return response.metrics.api;
  }

  async getAppiumMetrics(): Promise<AppiumMetrics> {
    const response = await this.getMetrics();
    return response.metrics.appium;
  }
}

// Export singleton instance
export const apiService = new ApiService();

// Utility functions
export const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export const formatUptime = (seconds: number): string => {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  
  if (days > 0) {
    return `${days}d ${hours}h ${minutes}m`;
  } else if (hours > 0) {
    return `${hours}h ${minutes}m`;
  } else {
    return `${minutes}m`;
  }
};

export const formatPercentage = (value: number): string => {
  return `${value.toFixed(1)}%`;
};

export const formatTimestamp = (timestamp: string): string => {
  return new Date(timestamp).toLocaleString();
};

export const getDeviceType = (name: string): 'iPhone' | 'iPad' | 'Simulator' | 'Unknown' => {
  const lowerName = name.toLowerCase();
  if (lowerName.includes('iphone')) return 'iPhone';
  if (lowerName.includes('ipad')) return 'iPad';
  if (lowerName.includes('simulator')) return 'Simulator';
  return 'Unknown';
};

// Badge color type to match the Badge component
export type BadgeColor = "primary" | "success" | "error" | "warning" | "info" | "light" | "dark";

export const getDeviceStatusColor = (device: Partial<Device>): BadgeColor => {
  const inUseBy = device.inUseBy;
  const isAvailable = device.available ?? device.isAvailable ?? false;
  
  if (inUseBy) return 'error'; // En uso
  if (isAvailable) return 'success'; // Disponible
  return 'warning'; // No disponible
};

export const getAutomationStatusColor = (status: AutomationSession['status']): BadgeColor => {
  switch (status) {
    case 'running':
      return 'success';
    case 'completed':
      return 'info';
    case 'error':
      return 'error';
    case 'initializing':
      return 'warning';
    case 'stopped':
      return 'warning';
    default:
      return 'warning';
  }
};
