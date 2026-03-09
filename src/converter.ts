import * as fs from 'node:fs'
import * as path from 'node:path'
import * as os from 'node:os'
import type { SshConfigHost, ElectermBookmarkSsh, ToBookmarkOptions } from './types.js'

interface KeyResult {
  content?: string
  path?: string
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
 * Convert SSH config host to electerm bookmark
 */
export function sshConfigHostToBookmark (
  host: SshConfigHost,
  options: ToBookmarkOptions = {}
): ElectermBookmarkSsh {
  const { defaultUsername, defaultPort = 22 } = options

  const bookmark: ElectermBookmarkSsh = {
    type: 'ssh',
    host: host.hostName ?? host.host,
    port: host.port ?? defaultPort,
    username: host.user ?? defaultUsername ?? '',
    authType: 'privateKey',
    title: host.host
  }

  // Add hostname as description if different from host
  // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
  if (host.hostName && host.hostName !== host.host) {
    bookmark.description = `SSH to ${host.hostName}`
  }

  // Handle identity files
  // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
  if ((host.identityFileList != null) && host.identityFileList.length > 0) {
    const keyResult = readPrivateKey(host.identityFileList[0])
    if (keyResult.content !== undefined) {
      bookmark.privateKey = keyResult.content
    } else if (keyResult.path !== undefined) {
      bookmark.privateKeyPath = keyResult.path
    }
  }

  // Handle certificate file
  // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
  if (host.certificateFile) {
    const certResult = readPrivateKey(host.certificateFile)
    if (certResult.content !== undefined) {
      bookmark.certificate = certResult.content
    }
  }

  // Handle proxy jump (SSH hopping)
  // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
  const proxyJumpHosts = host.proxyJumpList ?? (host.proxyJump ? [host.proxyJump] : [])
  if (proxyJumpHosts.length > 0) {
    const hops = proxyJumpHosts.map((jumpHost) => {
      return {
        host: jumpHost,
        port: 22,
        username: host.user ?? defaultUsername ?? '',
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
  if (host.proxyCommand) {
    // Proxy command is not directly supported in bookmark format
    // Could add as description
    bookmark.description = (bookmark.description ?? '') +
      // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
      (bookmark.description ? ' | ' : '') +
      `Proxy: ${host.proxyCommand}`
  }

  // Handle forward agent
  if (host.forwardAgent === 'yes' || host.forwardAgent === 'true') {
    bookmark.useSshAgent = true
  }

  // Handle server alive options
  if (host.serverAliveInterval !== undefined) {
    // These are SSH-level options, not stored in bookmark
  }

  // Handle connection timeout
  if (host.connectTimeout !== undefined) {
    // Could be added as custom field if needed
  }

  // Handle control master options (not directly supported in bookmark)
  // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
  if (host.controlMaster) {
    bookmark.description = (bookmark.description ?? '') +
      // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
      (bookmark.description ? ' | ' : '') +
      `ControlMaster: ${host.controlMaster}`
  }

  // Store extra options in description or as custom data
  // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
  if ((host.extraOptions != null) && Object.keys(host.extraOptions).length > 0) {
    const extraStr = Object.entries(host.extraOptions)
      // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
      .map(([key, value]) => `${key}=${value}`)
      .join(', ')
    bookmark.description = (bookmark.description ?? '') +
      // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
      (bookmark.description ? ' | ' : '') +
      `Extra: ${extraStr}`
  }

  return bookmark
}

/**
 * Convert all SSH config hosts to electerm bookmarks
 */
export function sshConfigToBookmarks (
  hosts: SshConfigHost[],
  options: ToBookmarkOptions = {}
): ElectermBookmarkSsh[] {
  return hosts.map(host => sshConfigHostToBookmark(host, options))
}
