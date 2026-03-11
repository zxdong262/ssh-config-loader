import * as fs from 'node:fs'
import * as path from 'node:path'
import * as os from 'node:os'
import type { SshConfigHost, ElectermBookmarkSsh, ToBookmarkOptions } from './types.js'

interface KeyResult {
  content?: string
  path?: string
}

function isWildcardPattern (pattern: string): boolean {
  return pattern.includes('*') || pattern.includes('?')
}

function matchHostPattern (pattern: string, hostname: string): boolean {
  const regexPattern = pattern
    .replace(/[.+^${}()|[\]\\]/g, '\\\\$&')
    .replace(/\*/g, '.*')
    .replace(/\?/g, '.')

  try {
    const regex = new RegExp(`^${regexPattern}$`)
    return regex.test(hostname)
  } catch {
    return false
  }
}

/**
 * Find a host config by name (host alias)
 * Used to resolve jump host details
 */
function findHostByName (hosts: SshConfigHost[], name: string): SshConfigHost | undefined {
  return hosts.find(h => h.host === name)
}

/**
 * Apply wildcard defaults to a host
 * defaults fill in missing properties from host
 */
function applyDefaults (host: SshConfigHost, defaults?: SshConfigHost): SshConfigHost {
  if (defaults == null) return host

  // Start with defaults, then overlay host-specific values
  // This ensures host-specific values take precedence
  const result: SshConfigHost = { ...defaults }

  for (const key of Object.keys(host) as Array<keyof SshConfigHost>) {
    const value = host[key]
    if (value !== undefined) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(result as any)[key] = value
    }
  }

  // Handle extraOptions specially - merge, with host overriding defaults
  if (defaults.extraOptions != null && host.extraOptions != null) {
    result.extraOptions = { ...defaults.extraOptions, ...host.extraOptions }
  } else if (host.extraOptions != null) {
    result.extraOptions = host.extraOptions
  }

  return result
}

/**
 * Generate a unique ID
 */
function generateId (): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
}

/**
 * Read private key or certificate content
 */
function readPrivateKey (keyPath: string): KeyResult {
  if (keyPath === '') return {}

  try {
    // Expand ~ to home directory
    const expandedPath = keyPath.startsWith('~')
      ? path.join(os.homedir(), keyPath.slice(2))
      : keyPath

    if (fs.existsSync(expandedPath)) {
      return { content: fs.readFileSync(expandedPath, 'utf-8') }
    }
  } catch {
    // Return the path itself if we can't read it
  }
  return { path: keyPath }
}

/**
 * Options for converting SSH config host to bookmark
 */
export interface SshConfigHostToBookmarkOptions extends ToBookmarkOptions {
  /**
   * Wildcard defaults (Host *)
   */
  defaults?: SshConfigHost
  /**
   * All hosts in the config (for resolving jump host details)
   */
  hosts?: SshConfigHost[]
}

/**
 * Convert SSH config host to electerm bookmark
 */
export function sshConfigHostToBookmark (
  host: SshConfigHost,
  options: SshConfigHostToBookmarkOptions = {}
): ElectermBookmarkSsh {
  const { defaultUsername, defaultPort = 22, defaults, hosts } = options

  let resolvedHost = host

  if (hosts != null) {
    const wildcardPatterns = hosts
      .filter(h => isWildcardPattern(h.host) && h.host !== '*')
      .filter(pattern => matchHostPattern(pattern.host, host.host))
      .sort((a, b) => a.host.length - b.host.length)

    for (const pattern of wildcardPatterns) {
      resolvedHost = applyDefaults(resolvedHost, pattern)
    }
  }

  if (defaults != null) {
    resolvedHost = applyDefaults(resolvedHost, defaults)
  }

  const bookmark: ElectermBookmarkSsh = {
    type: 'ssh',
    host: resolvedHost.hostName ?? resolvedHost.host,
    port: resolvedHost.port ?? defaultPort,
    username: resolvedHost.user ?? defaultUsername ?? '',
    authType: 'privateKey',
    title: resolvedHost.host
  }

  // Add hostname as description if different from host
  // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
  if (resolvedHost.hostName && resolvedHost.hostName !== resolvedHost.host) {
    bookmark.description = `SSH to ${resolvedHost.hostName}`
  }

  // Handle identity files
  // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
  if ((resolvedHost.identityFileList != null) && resolvedHost.identityFileList.length > 0) {
    const keyResult = readPrivateKey(resolvedHost.identityFileList[0])
    if (keyResult.content !== undefined) {
      bookmark.privateKey = keyResult.content
    } else if (keyResult.path !== undefined) {
      bookmark.privateKeyPath = keyResult.path
    }
  }

  // Handle certificate file
  // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
  if (resolvedHost.certificateFile) {
    const certResult = readPrivateKey(resolvedHost.certificateFile)
    if (certResult.content !== undefined) {
      bookmark.certificate = certResult.content
    }
  }

  // Handle proxy jump (SSH hopping)
  // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
  const proxyJumpHosts = resolvedHost.proxyJumpList ?? (resolvedHost.proxyJump ? [resolvedHost.proxyJump] : [])
  if (proxyJumpHosts.length > 0) {
    const hops = proxyJumpHosts.map((jumpHostName) => {
      // Try to find jump host config to get actual hostname/port/user
      const jumpHostConfig = hosts != null ? findHostByName(hosts, jumpHostName) : undefined

      // Apply defaults to jump host as well
      const resolvedJumpHost = applyDefaults(jumpHostConfig ?? { host: jumpHostName }, defaults)

      // Use jump host's user, or fall back to parent host's user, then defaultUsername
      const jumpUsername = resolvedJumpHost.user ?? resolvedHost.user ?? defaultUsername ?? ''

      return {
        id: generateId(),
        host: resolvedJumpHost.hostName ?? jumpHostName,
        port: resolvedJumpHost.port ?? 22,
        username: jumpUsername,
        authType: 'privateKey' as const,
        privateKey: bookmark.privateKey,
        passphrase: bookmark.passphrase
      }
    })
    bookmark.connectionHoppings = hops
    bookmark.hasHopping = true
  }

  // Handle proxy command
  // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
  if (resolvedHost.proxyCommand) {
    // Proxy command is not directly supported in bookmark format
    // Could add as description
    bookmark.description = (bookmark.description ?? '') +
      // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
      (bookmark.description ? ' | ' : '') +
      `Proxy: ${resolvedHost.proxyCommand}`
  }

  // Handle forward agent
  if (resolvedHost.forwardAgent === 'yes' || resolvedHost.forwardAgent === 'true') {
    bookmark.useSshAgent = true
  }

  // Handle identity agent (SSH_AUTH_SOCK)
  if (resolvedHost.identityAgent != null && resolvedHost.identityAgent !== '') {
    bookmark.sshAgent = resolvedHost.identityAgent
    bookmark.useSshAgent = true
  }

  // Handle identities only (only use specified identities, no agent)
  if (resolvedHost.identitiesOnly === 'yes' || resolvedHost.identitiesOnly === 'true') {
    bookmark.useSshAgent = false
  }

  // Handle server alive options
  // SSH config uses seconds, electerm uses milliseconds
  if (resolvedHost.serverAliveInterval !== undefined) {
    bookmark.keepaliveInterval = resolvedHost.serverAliveInterval * 1000
  }
  if (resolvedHost.serverAliveCountMax !== undefined) {
    bookmark.keepaliveCountMax = resolvedHost.serverAliveCountMax
  }

  // Handle connection timeout
  if (resolvedHost.connectTimeout !== undefined) {
    // Could be added as custom field if needed
  }

  // Handle control master options (not directly supported in bookmark)
  // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
  if (resolvedHost.controlMaster) {
    bookmark.description = (bookmark.description ?? '') +
      // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
      (bookmark.description ? ' | ' : '') +
      `ControlMaster: ${resolvedHost.controlMaster}`
  }

  // Store extra options in description or as custom data
  // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
  if ((resolvedHost.extraOptions != null) && Object.keys(resolvedHost.extraOptions).length > 0) {
    const extraStr = Object.entries(resolvedHost.extraOptions)
      // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
      .map(([key, value]) => `${key}=${value}`)
      .join(', ')
    bookmark.description = (bookmark.description ?? '') +
      // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
      (bookmark.description ? ' | ' : '') +
      `Extra: ${extraStr}`
  }

  // Handle port forwarding
  // LocalForward: forwardLocalToRemote (local -> remote)
  if (resolvedHost.localForward != null && resolvedHost.localForward.length > 0) {
    bookmark.sshTunnels = bookmark.sshTunnels ?? []
    for (const forward of resolvedHost.localForward) {
      bookmark.sshTunnels.push({
        id: generateId(),
        sshTunnel: 'forwardLocalToRemote',
        sshTunnelLocalHost: forward.bindAddress ?? '127.0.0.1',
        sshTunnelLocalPort: forward.port,
        sshTunnelRemoteHost: forward.host,
        sshTunnelRemotePort: forward.hostPort
      })
    }
  }

  // RemoteForward: forwardRemoteToLocal (remote -> local)
  if (resolvedHost.remoteForward != null && resolvedHost.remoteForward.length > 0) {
    bookmark.sshTunnels = bookmark.sshTunnels ?? []
    for (const forward of resolvedHost.remoteForward) {
      bookmark.sshTunnels.push({
        id: generateId(),
        sshTunnel: 'forwardRemoteToLocal',
        sshTunnelLocalHost: forward.bindAddress ?? '127.0.0.1',
        sshTunnelLocalPort: forward.port,
        sshTunnelRemoteHost: forward.host,
        sshTunnelRemotePort: forward.hostPort
      })
    }
  }

  // DynamicForward: dynamicForward (SOCKS proxy)
  if (resolvedHost.dynamicForward != null && resolvedHost.dynamicForward.length > 0) {
    bookmark.sshTunnels = bookmark.sshTunnels ?? []
    for (const forward of resolvedHost.dynamicForward) {
      bookmark.sshTunnels.push({
        id: generateId(),
        sshTunnel: 'dynamicForward',
        sshTunnelLocalHost: forward.bindAddress ?? '127.0.0.1',
        sshTunnelLocalPort: forward.port
      })
    }
  }

  return bookmark
}

/**
 * Options for converting all SSH config hosts to bookmarks
 */
export interface SshConfigToBookmarksOptions extends SshConfigHostToBookmarkOptions {
  /**
   * If true, exclude wildcard defaults (Host *) from output
   * Default: true
   */
  excludeDefaults?: boolean
}

/**
 * Convert all SSH config hosts to electerm bookmarks
 */
export function sshConfigToBookmarks (
  hosts: SshConfigHost[],
  options: SshConfigToBookmarksOptions = {}
): ElectermBookmarkSsh[] {
  const { defaults, excludeDefaults = true, hosts: allHosts, ...restOptions } = options

  const hostsToFilter = allHosts ?? hosts

  const hostsToConvert = excludeDefaults
    ? hostsToFilter.filter(h => !isWildcardPattern(h.host))
    : hostsToFilter

  const wildcardPatterns = hostsToFilter.filter(h => isWildcardPattern(h.host) && h.host !== '*')

  return hostsToConvert.map(host => sshConfigHostToBookmark(host, {
    ...restOptions,
    defaults,
    hosts: wildcardPatterns
  }))
}
