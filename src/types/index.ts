export interface ProxyRule {
  name: string;
  port: number;
  target: string;
  paths?: string[];
  headers?: Record<string, string>;
}

export interface HopConfig {
  proxies: ProxyRule[];
}

export interface AddProxyOptions {
  name?: string;
  port?: number;
  target?: string;
  paths?: string[];
  headers?: Record<string, string>;
}
