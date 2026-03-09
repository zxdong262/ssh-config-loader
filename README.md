# ssh-config-loader

[![npm version](https://img.shields.io/npm/v/ssh-config-loader)](https://www.npmjs.com/package/ssh-config-loader)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue)](https://www.typescriptlang.org/)
[![Vitest](https://img.shields.io/badge/Vitest-2.1-green)](https://vitest.dev/)
[![Vite](https://img.shields.io/badge/Vite-7.3-purple)](https://vitejs.dev/)
[![ts-standard](https://img.shields.io/badge/ts--standard-12.0-yellow)](https://github.com/standard/ts-standard)

| [English](./README.md) | [中文](./README_zh_CN.md) |

A JavaScript/TypeScript library to parse SSH config (`~/.ssh/config`) and convert to [electerm-bookmark](https://github.com/electerm/electerm) format.

## Features

- Parse SSH config files with full support for all common SSH options
- Convert SSH config to electerm-bookmark format
- Support custom config paths
- TypeScript support
- Both ESM and CJS builds

## Installation

```bash
npm install ssh-config-loader
```

## Usage

```typescript
import { loadSshConfig, loadAndConvert, sshConfigHostToBookmark } from 'ssh-config-loader'

// Load and convert SSH config to electerm bookmarks
const bookmarks = loadAndConvert()

// Specify custom config path
const bookmarks = loadAndConvert({
  configPath: '/path/to/config',
  defaultUsername: 'myuser',
  defaultPort: 22
})

// Manual parsing and conversion
const config = loadSshConfig({ configPath: '/path/to/config' })
const bookmark = sshConfigHostToBookmark(config.hosts[0])
```

## API

### `loadAndConvert(options?)`

Load SSH config and convert to electerm bookmarks.

**Options:**
- `configPath?: string` - Custom SSH config path (default: ~/.ssh/config)
- `includeDefaultPaths?: boolean` - Include default paths (default: true)
- `defaultUsername?: string` - Default username if not specified in config
- `defaultPort?: number` - Default port (default: 22)

**Returns:** `ElectermBookmarkSsh[]`

### `loadSshConfig(options?)`

Load and parse SSH config file(s).

**Options:**
- `configPath?: string` - Custom SSH config path
- `includeDefaultPaths?: boolean` - Include default paths (default: true)

**Returns:** `SshConfig`

### `sshConfigHostToBookmark(host, options?)`

Convert a single SSH config host to electerm bookmark.

**Parameters:**
- `host: SshConfigHost` - SSH config host entry
- `options?: ToBookmarkOptions` - Conversion options

**Returns:** `ElectermBookmarkSsh`

## SSH Config Options Supported

- Host, HostName, Port, User
- IdentityFile (multiple keys supported)
- ProxyJump (SSH hopping)
- ProxyCommand
- ForwardAgent
- ServerAliveInterval, ServerAliveCountMax
- Compression
- ConnectionAttempts, ConnectTimeout
- TCPKeepAlive
- ControlMaster, ControlPath, ControlPersist
- And more...

## NPM Scripts

- `npm run build` - Build ESM and CJS
- `npm run test` - Run tests
- `npm run lint` - Lint code
- `npm run lint:fix` - Fix lint errors
- `npm run format` - Format code

## License

MIT
