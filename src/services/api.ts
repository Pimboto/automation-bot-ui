// Device Types
export interface Device {
  udid: string;
  name: string;
  version: string;
  isAvailable: boolean;
  lastDetected: string;
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
  supportsInfiniteMode: boolean;
  available: boolean;
  checkpoints: FlowCheckpoint[];
  defaultParams: {
    checkpoint: string;
    generateProfile?: boolean;
    infinite?: boolean;
    maxRuns?: number;
    maxConsecutiveErrors?: number;
    params?: Record<string, any>;
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
  result?: any;
  infinite: boolean;
  runCount?: number;
  maxRuns: number;
  profileGenerated?: boolean;
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
  };
  params?: Record<string, any>;
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
  data: Record<string, any>;
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

class ApiService {
  private baseURL: string;
  private token: string;

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

  // Get system metrics
  async getMetrics(): Promise<MetricsResponse> {
    return this.request<MetricsResponse>('/api/metrics');
  }

  // Health check
  async getHealth(): Promise<HealthResponse> {
    return this.request<HealthResponse>('/api/health');
  }

  // Device endpoints
  async getDevices(): Promise<DevicesResponse> {
    return this.request<DevicesResponse>('/api/devices');
  }

  async getAvailableDevices(): Promise<DevicesResponse> {
    return this.request<DevicesResponse>('/api/devices/available');
  }

  async getDevice(udid: string): Promise<DeviceResponse> {
    return this.request<DeviceResponse>(`/api/devices/${udid}`);
  }

  // Flow configuration endpoints (NUEVOS)
  async getAutomationFlows(): Promise<FlowsResponse> {
    return this.request<FlowsResponse>('/api/automation/flows');
  }

  async getFlowConfig(flowName: string): Promise<{ status: string; flow: FlowConfig }> {
    return this.request<{ status: string; flow: FlowConfig }>(`/api/automation/flows/${flowName}`);
  }

  // Automation endpoints
  async startAutomation(request: AutomationStartRequest): Promise<AutomationStartResponse> {
    return this.request<AutomationStartResponse>('/api/automation/start', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  async getAutomationStatus(sessionId: string): Promise<AutomationStatusResponse> {
    return this.request<AutomationStatusResponse>(`/api/automation/${sessionId}/status`);
  }

  async getAutomationLogs(
    sessionId: string,
    limit: number = 50,
    level?: 'info' | 'warn' | 'error' | 'debug'
  ): Promise<AutomationLogsResponse> {
    const params = new URLSearchParams({ limit: limit.toString() });
    if (level) params.append('level', level);
    
    return this.request<AutomationLogsResponse>(
      `/api/automation/${sessionId}/logs?${params.toString()}`
    );
  }

  async stopAutomation(sessionId: string): Promise<{ status: string; message: string }> {
    return this.request<{ status: string; message: string }>(`/api/automation/${sessionId}/stop`, {
      method: 'POST',
    });
  }

  // Appium server endpoints
  async getAppiumServers(): Promise<AppiumServersResponse> {
    return this.request<AppiumServersResponse>('/api/appium/servers');
  }

  async getAppiumServer(udid: string): Promise<AppiumServerResponse> {
    return this.request<AppiumServerResponse>(`/api/appium/servers/${udid}`);
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

export const getDeviceStatusColor = (isAvailable: boolean, inUseBy?: string | null): string => {
  if (inUseBy) return 'error'; // En uso
  if (isAvailable) return 'success'; // Disponible
  return 'warning'; // No disponible
};

export const getAutomationStatusColor = (status: AutomationSession['status']): string => {
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
