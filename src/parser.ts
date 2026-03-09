import * as fs from 'node:fs'
import * as path from 'node:path'
import * as os from 'node:os'
import type { SshConfig, SshConfigHost, LoadSshConfigOptions } from './types.js'

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
function parseConfigContent (content: string): SshConfigHost[] {
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

  return hosts
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

  for (const filePath of configPaths) {
    if (isConfigFileReadable(filePath)) {
      const content = fs.readFileSync(filePath, 'utf-8')
      const hosts = parseConfigContent(content)

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

      if (usedConfigPath === undefined) {
        usedConfigPath = filePath
      }
    }
  }

  return {
    hosts: allHosts,
    configPath: usedConfigPath
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
