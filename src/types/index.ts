export interface CorsConfig {
  allowOrigin?: string;
  allowHeaders?: string[] | '*';
  allowMethods?: string[];
  allowCredentials?: boolean;
}

export interface ProxyRule {
  name: string;
  port: number;
  target: string;
  paths?: string[];
  headers?: Record<string, string>;
  cors?: CorsConfig;
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
