// Types
import type {
  SshConfigHost,
  SshConfig,
  ElectermBookmarkSsh,
  ElectermBookmark,
  LoadSshConfigOptions,
  ToBookmarkOptions
} from './types.js'

// Parser
import { loadSshConfig, loadSshConfigFromFile, getDefaultConfigPath, resolveHost, getResolvedConfig } from './parser.js'

// Converter
import {
  sshConfigHostToBookmark,
  sshConfigToBookmarks,
  type SshConfigHostToBookmarkOptions,
  type SshConfigToBookmarksOptions
} from './converter.js'

// Types exports
export type {
  SshConfigHost,
  SshConfig,
  ElectermBookmarkSsh,
  ElectermBookmark,
  LoadSshConfigOptions,
  ToBookmarkOptions,
  SshConfigHostToBookmarkOptions,
  SshConfigToBookmarksOptions
}

// Parser exports
export {
  loadSshConfig,
  loadSshConfigFromFile,
  getDefaultConfigPath,
  resolveHost,
  getResolvedConfig
}

// Converter exports
export {
  sshConfigHostToBookmark,
  sshConfigToBookmarks
}

/**
 * Load SSH config and convert to electerm bookmarks
 */
export function loadAndConvert (
  options: {
    configPath?: string
    includeDefaultPaths?: boolean
  } & ToBookmarkOptions = {}
): ElectermBookmarkSsh[] {
  const { defaultUsername, defaultPort, ...loadOptions } = options

  const config = loadSshConfig(loadOptions)
  return sshConfigToBookmarks(config.hosts, {
    defaultUsername,
    defaultPort,
    defaults: config.defaults
  })
}
