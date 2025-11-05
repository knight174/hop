export interface ProxyRule {
  port: number;
  target: string;
  headers?: Record<string, string>;
}

export interface HopConfig {
  proxies: ProxyRule[];
}

export interface AddProxyOptions {
  port?: number;
  target?: string;
  headers?: Record<string, string>;
}
