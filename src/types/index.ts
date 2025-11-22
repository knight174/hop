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
  plugins?: string[];
}

export interface HopPlugin {
  onRequest?: (req: any, res: any, next: () => void) => void;
  onResponse?: (proxyRes: any, req: any, res: any) => void;
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
