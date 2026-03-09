/**
 * SSH Config Host Entry
 */
export interface SshConfigHost {
  host: string
  hostName?: string
  port?: number
  user?: string
  identityFile?: string
  identityFileList?: string[]
  certificateFile?: string
  proxyCommand?: string
  proxyJump?: string
  proxyJumpList?: string[]
  forwardAgent?: string
  addKeysToAgent?: string
  /**
   * Specify which identity file to use (SSH config: IdentitiesOnly)
   */
  identitiesOnly?: string
  /**
   * Agent socket to use (SSH config: IdentityAgent)
   */
  identityAgent?: string
  userKnownHostsFile?: string
  strictHostKeyChecking?: string
  serverAliveInterval?: number
  serverAliveCountMax?: number
  compress?: string
  connectionAttempts?: number
  connectTimeout?: number
  tcpKeepAlive?: string
  controlMaster?: string
  controlPath?: string
  controlPersist?: string
  password?: string
  passphrase?: string
  /**
   * Local port forwarding - forwards local port to remote
   * Format: LocalForward [bind_address:]port host:hostport
   */
  localForward?: Array<{
    bindAddress?: string
    port: number
    host: string
    hostPort: number
  }>
  /**
   * Remote port forwarding - forwards remote port to local
   * Format: RemoteForward [bind_address:]port host:hostport
   */
  remoteForward?: Array<{
    bindAddress?: string
    port: number
    host: string
    hostPort: number
  }>
  /**
   * Dynamic port forwarding - SOCKS proxy
   * Format: DynamicForward [bind_address:]port
   */
  dynamicForward?: Array<{
    bindAddress?: string
    port: number
  }>
  extraOptions?: Record<string, string | number | undefined>
}

/**
 * Parsed SSH Config
 */
export interface SshConfig {
  hosts: SshConfigHost[]
  configPath?: string
  /**
   * Wildcard defaults (Host *)
   */
  defaults?: SshConfigHost
}

/**
 * Electerm Bookmark SSH Type
 */
export interface ElectermBookmarkSsh {
  type: 'ssh'
  host: string
  port?: number
  username: string
  password?: string
  privateKey?: string
  privateKeyPath?: string
  passphrase?: string
  certificate?: string
  authType?: 'password' | 'privateKey' | 'profiles'
  profile?: string
  title?: string
  description?: string
  startDirectoryRemote?: string
  startDirectoryLocal?: string
  enableSsh?: boolean
  enableSftp?: boolean
  sshTunnels?: Array<{
    id?: string
    sshTunnel: string
    sshTunnelLocalHost?: string
    sshTunnelLocalPort?: number
    sshTunnelRemoteHost?: string
    sshTunnelRemotePort?: number
    name?: string
  }>
  connectionHoppings?: Array<{
    id?: string
    host: string
    port?: number
    username?: string
    password?: string
    privateKey?: string
    passphrase?: string
    certificate?: string
    authType?: string
    profile?: string
  }>
  hasHopping?: boolean
  useSshAgent?: boolean
  sshAgent?: string
  serverHostKey?: string[]
  cipher?: string[]
  keepaliveInterval?: number
  keepaliveCountMax?: number
  runScripts?: Array<{
    delay?: number
    script?: string
  }>
  quickCommands?: Array<{
    name?: string
    command?: string
  }>
  proxy?: string
  x11?: boolean
  term?: string
  displayRaw?: boolean
  encode?: string
  envLang?: string
  setEnv?: string
  color?: string
  interactiveValues?: string
}

/**
 * Electerm Bookmark (generic type, we focus on SSH)
 */
export type ElectermBookmark = ElectermBookmarkSsh

/**
 * Options for loading SSH config
 */
export interface LoadSshConfigOptions {
  /**
   * Path to SSH config file
   * Default: ~/.ssh/config
   */
  configPath?: string

  /**
   * Whether to include default SSH config paths
   * Default: true
   */
  includeDefaultPaths?: boolean
}

/**
 * Options for converting to electerm bookmark
 */
export interface ToBookmarkOptions {
  /**
   * Default username to use if not specified in config
   */
  defaultUsername?: string

  /**
   * Default port to use if not specified in config
   * Default: 22
   */
  defaultPort?: number
}
