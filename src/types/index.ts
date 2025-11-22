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
  pathRewrite?: Record<string, string>;
  headers?: Record<string, string>;
  cors?: CorsConfig;
  https?: boolean;
}

export interface HopConfig {
  proxies: ProxyRule[];
}

export interface AddProxyOptions {
  name?: string;
  port?: number;
  target?: string;
  paths?: string[];
  pathRewrite?: Record<string, string>;
  headers?: Record<string, string>;
  https?: boolean;
}
