import { ProxyManager } from '../../core/ProxyManager';
import { ProxyRule } from '../../core/config';

export function formatProxyStatus(proxy: ProxyRule, proxyManager: ProxyManager, useColorTags: boolean = true): string {
  const isRunning = proxyManager.isRunning(proxy.name);
  const isLocal = proxyManager.isRunningLocally(proxy.name);

  if (useColorTags) {
    if (isRunning) {
      return isLocal ? '{green-fg}Running{/}' : '{yellow-fg}Running (Ext){/}';
    }
    return '{red-fg}Stopped{/}';
  } else {
    if (isRunning) {
      return isLocal ? 'Running' : 'Running (External)';
    }
    return 'Stopped';
  }
}

export function getStatusColor(proxy: ProxyRule, proxyManager: ProxyManager): string {
  const isRunning = proxyManager.isRunning(proxy.name);
  const isLocal = proxyManager.isRunningLocally(proxy.name);

  if (isRunning) {
    return isLocal ? '{green-fg}' : '{yellow-fg}';
  }
  return '{red-fg}';
}
