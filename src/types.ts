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
  extraOptions?: Record<string, string | number | undefined>
}

/**
 * Parsed SSH Config
 */
export interface SshConfig {
  hosts: SshConfigHost[]
  configPath?: string
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
    sshTunnel: string
    sshTunnelLocalHost?: string
    sshTunnelLocalPort?: number
    sshTunnelRemoteHost?: string
    sshTunnelRemotePort?: number
    name?: string
  }>
  connectionHoppings?: Array<{
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
