import * as fs from 'node:fs'
import * as path from 'node:path'
import * as os from 'node:os'
import type { SshConfig, SshConfigHost, LoadSshConfigOptions } from './types.js'

/**
 * Check if a host pattern contains wildcards
 */
function isWildcardPattern (pattern: string): boolean {
  return pattern.includes('*') || pattern.includes('?')
}

/**
 * Match a hostname against a host pattern
 * Supports * (match any characters) and ? (match single character)
 */
function matchHostPattern (pattern: string, hostname: string): boolean {
  // Convert glob pattern to regex
  const regexPattern = pattern
    .replace(/[.+^${}()|[\]\\]/g, '\\\\$&') // Escape special regex chars except * and ?
    .replace(/\*/g, '.*') // * matches any characters
    .replace(/\?/g, '.') // ? matches single character

  try {
    const regex = new RegExp(`^${regexPattern}$`)
    return regex.test(hostname)
  } catch {
    return false
  }
}

/**
 * Get default SSH config paths
 */
function getDefaultConfigPaths (): string[] {
  const homeDir = os.homedir()
  return [
    path.join(homeDir, '.ssh', 'config'),
    path.join(homeDir, '.ssh', 'config.')
  ]
}

/**
 * Check if a file path exists and is readable
 */
function isConfigFileReadable (filePath: string): boolean {
  try {
    return fs.statSync(filePath).isFile()
  } catch {
    return false
  }
}

/**
 * Parse a single SSH config value
 * Handles quoted values and multi-word values
 */
function parseValue (value: string): string {
  // Remove surrounding quotes if present
  const trimmed = value.trim()
  if ((trimmed.startsWith('"') && trimmed.endsWith('"')) ||
      (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
    return trimmed.slice(1, -1)
  }
  return trimmed
}

/**
 * Parse SSH config content
 */
function parseConfigContent (content: string): { hosts: SshConfigHost[], defaults?: SshConfigHost } {
  const hosts: SshConfigHost[] = []
  const lines = content.split('\n')

  let currentHost: SshConfigHost | null = null

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const trimmedLine = line.trim()

    // Skip empty lines and comments
    if (trimmedLine === '' || trimmedLine.startsWith('#')) {
      continue
    }

    // Split by first whitespace to get key and value
    const match = trimmedLine.match(/^(\S+)\s+(.*)$/)
    if (match == null) {
      continue
    }

    const [, key, rawValue] = match
    const value = parseValue(rawValue)
    const lowerKey = key.toLowerCase()

    if (lowerKey === 'host') {
      // Save previous host if exists
      if (currentHost !== null) {
        hosts.push(currentHost)
      }
      // Start new host
      currentHost = {
        host: value,
        extraOptions: {}
      }
    } else if (currentHost !== null) {
      // Parse host options
      switch (lowerKey) {
        case 'hostname':
          currentHost.hostName = value
          break
        case 'port':
          currentHost.port = parseInt(value, 10)
          break
        case 'user':
          currentHost.user = value
          break
        case 'identityfile':
          if (currentHost.identityFileList == null) {
            currentHost.identityFileList = []
            currentHost.identityFile = value
          }
          currentHost.identityFileList.push(value)
          break
        case 'certificatefile':
          currentHost.certificateFile = value
          break
        case 'proxycommand':
          currentHost.proxyCommand = value
          break
        case 'proxyjump': {
          // Handle comma-separated proxy jumps
          // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
          if (currentHost.proxyJumpList == null) {
            currentHost.proxyJumpList = []
          }
          // Split by comma and add each jump host
          const proxyJumps = value.split(',').map(s => s.trim())
          for (const jump of proxyJumps) {
            if (currentHost.proxyJumpList.length === 0) {
              currentHost.proxyJump = jump
            }
            currentHost.proxyJumpList.push(jump)
          }
          break
        }
        case 'forwardagent':
          currentHost.forwardAgent = value
          break
        case 'addkeystoagent':
          currentHost.addKeysToAgent = value
          break
        case 'userknownhostsfile':
          currentHost.userKnownHostsFile = value
          break
        case 'stricthostkeychecking':
          currentHost.strictHostKeyChecking = value
          break
        case 'serveraliveinterval':
          currentHost.serverAliveInterval = parseInt(value, 10)
          break
        case 'serveralivecountmax':
          currentHost.serverAliveCountMax = parseInt(value, 10)
          break
        case 'compression':
          currentHost.compress = value
          break
        case 'connectionattempts':
          currentHost.connectionAttempts = parseInt(value, 10)
          break
        case 'connecttimeout':
          currentHost.connectTimeout = parseInt(value, 10)
          break
        case 'tcpkeepalive':
          currentHost.tcpKeepAlive = value
          break
        case 'controlmaster':
          currentHost.controlMaster = value
          break
        case 'controlpath':
          currentHost.controlPath = value
          break
        case 'controlpersist':
          currentHost.controlPersist = value
          break
        case 'localforward': {
          // Format: LocalForward [bind_address:]port host:hostport
          const forwardMatch = value.match(/^(?:(\S+):)?(\d+)\s+(\S+):(\d+)$/)
          if (forwardMatch != null) {
            const [, bindAddress, port, host, hostPort] = forwardMatch
            if (currentHost.localForward == null) {
              currentHost.localForward = []
            }
            currentHost.localForward.push({
              bindAddress: bindAddress !== undefined && bindAddress !== '' ? bindAddress : undefined,
              port: parseInt(port, 10),
              host,
              hostPort: parseInt(hostPort, 10)
            })
          }
          break
        }
        case 'remoteforward': {
          // Format: RemoteForward [bind_address:]port host:hostport
          const forwardMatch = value.match(/^(?:(\S+):)?(\d+)\s+(\S+):(\d+)$/)
          if (forwardMatch != null) {
            const [, bindAddress, port, host, hostPort] = forwardMatch
            if (currentHost.remoteForward == null) {
              currentHost.remoteForward = []
            }
            currentHost.remoteForward.push({
              bindAddress: bindAddress !== undefined && bindAddress !== '' ? bindAddress : undefined,
              port: parseInt(port, 10),
              host,
              hostPort: parseInt(hostPort, 10)
            })
          }
          break
        }
        case 'dynamicforward': {
          // Format: DynamicForward [bind_address:]port
          const forwardMatch = value.match(/^(?:(\S+):)?(\d+)$/)
          if (forwardMatch != null) {
            const [, bindAddress, port] = forwardMatch
            if (currentHost.dynamicForward == null) {
              currentHost.dynamicForward = []
            }
            currentHost.dynamicForward.push({
              bindAddress: bindAddress !== undefined && bindAddress !== '' ? bindAddress : undefined,
              port: parseInt(port, 10)
            })
          }
          break
        }
        default:
          // Store any unknown options in extraOptions
          if (currentHost.extraOptions !== undefined) {
            // Try to parse as number
            const numValue = parseInt(value, 10)
            currentHost.extraOptions[lowerKey] = isNaN(numValue) ? value : numValue
          }
          break
      }
    }
  }

  // Don't forget the last host
  if (currentHost !== null) {
    hosts.push(currentHost)
  }

  // Extract wildcard defaults (Host *)
  const defaultHosts = hosts.filter(h => h.host === '*')
  const defaults = defaultHosts.length > 0 ? defaultHosts[0] : undefined

  // Filter out only exact wildcard '*' hosts from regular hosts
  // Keep wildcard patterns like 'dev-*' in the hosts array
  const regularHosts = hosts.filter(h => h.host !== '*')

  return {
    hosts: regularHosts,
    defaults
  }
}

/**
 * Load and parse SSH config file(s)
 */
export function loadSshConfig (options: LoadSshConfigOptions = {}): SshConfig {
  const { configPath, includeDefaultPaths = true } = options

  const configPaths: string[] = []

  // Add custom config path if provided
  // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
  if (configPath) {
    configPaths.push(configPath)
  }

  // Add default paths if requested
  if (includeDefaultPaths) {
    const defaultPaths = getDefaultConfigPaths()
    for (const defaultPath of defaultPaths) {
      if (isConfigFileReadable(defaultPath) && !configPaths.includes(defaultPath)) {
        configPaths.push(defaultPath)
      }
    }
  }

  // Read and parse all config files
  const allHosts: SshConfigHost[] = []
  let usedConfigPath: string | undefined
  let combinedDefaults: SshConfigHost | undefined

  for (const filePath of configPaths) {
    if (isConfigFileReadable(filePath)) {
      const content = fs.readFileSync(filePath, 'utf-8')
      const { hosts, defaults } = parseConfigContent(content)

      // Merge hosts, later configs can override earlier ones
      for (const host of hosts) {
        const existingIndex = allHosts.findIndex(h => h.host === host.host)
        if (existingIndex >= 0) {
          // Merge options
          allHosts[existingIndex] = { ...allHosts[existingIndex], ...host }
        } else {
          allHosts.push(host)
        }
      }

      // Merge defaults (later configs override)
      if (defaults != null) {
        if (combinedDefaults != null) {
          combinedDefaults = { ...combinedDefaults, ...defaults }
        } else {
          combinedDefaults = defaults
        }
      }

      if (usedConfigPath === undefined) {
        usedConfigPath = filePath
      }
    }
  }

  return {
    hosts: allHosts,
    configPath: usedConfigPath,
    defaults: combinedDefaults
  }
}

/**
 * Load SSH config from a specific path
 */
export function loadSshConfigFromFile (filePath: string): SshConfig {
  return loadSshConfig({ configPath: filePath, includeDefaultPaths: false })
}

/**
 * Get default SSH config path (~/.ssh/config)
 */
export function getDefaultConfigPath (): string {
  return path.join(os.homedir(), '.ssh', 'config')
}

/**
 * Resolve SSH config for a specific hostname
 * Matches against exact host, wildcard patterns, and defaults
 */
export function resolveHost (
  hosts: SshConfigHost[],
  hostname: string,
  defaults?: SshConfigHost
): SshConfigHost | undefined {
  // First try exact match
  const exactMatch = hosts.find(h => h.host === hostname)
  if (exactMatch != null) {
    return exactMatch
  }

  // Then try wildcard patterns
  const wildcardMatch = hosts.find(h => isWildcardPattern(h.host) && matchHostPattern(h.host, hostname))
  if (wildcardMatch != null) {
    return wildcardMatch
  }

  return undefined
}

/**
 * Get resolved SSH config for a hostname including wildcard and default settings
 */
export function getResolvedConfig (
  hosts: SshConfigHost[],
  hostname: string,
  defaults?: SshConfigHost
): SshConfigHost | undefined {
  const matchedHost = resolveHost(hosts, hostname, defaults)
  if (matchedHost == null) {
    return undefined
  }

  // Start with defaults, then overlay wildcard match, then exact match would override
  // However, since we already found a match, we use that directly
  // The matchedHost already has its specific settings

  // If there are defaults, apply them
  if (defaults != null) {
    return { ...defaults, ...matchedHost }
  }

  return matchedHost
}
