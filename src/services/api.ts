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

  // Get system metrics
  async getMetrics(): Promise<MetricsResponse> {
    return this.request<MetricsResponse>('/api/metrics');
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
