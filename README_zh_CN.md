# ssh-config-loader

[![npm 版本](https://img.shields.io/npm/v/ssh-config-loader)](https://www.npmjs.com/package/ssh-config-loader)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue)](https://www.typescriptlang.org/)
[![Vitest](https://img.shields.io/badge/Vitest-2.1-green)](https://vitest.dev/)
[![Vite](https://img.shields.io/badge/Vite-7.3-purple)](https://vitejs.dev/)
[![ts-standard](https://img.shields.io/badge/ts--standard-12.0-yellow)](https://github.com/standard/ts-standard)

| [English](./README.md) | [中文](./README_zh_CN.md) |

一个 JavaScript/TypeScript 库，用于解析 SSH 配置文件（`~/.ssh/config`）并转换为 [electerm-bookmark](https://github.com/electerm/electerm) 格式。

## 特性

- 完整支持所有常见 SSH 配置选项
- 将 SSH 配置转换为 electerm-bookmark 格式
- 支持自定义配置文件路径
- 支持 TypeScript
- 同时支持 ESM 和 CJS 构建

## 安装

```bash
npm install ssh-config-loader
```

## 使用方法

```typescript
import { loadSshConfig, loadAndConvert, sshConfigHostToBookmark } from 'ssh-config-loader'

// 加载并转换 SSH 配置为 electerm bookmarks
const bookmarks = loadAndConvert()

// 指定自定义配置路径
const bookmarks = loadAndConvert({
  configPath: '/path/to/config',
  defaultUsername: 'myuser',
  defaultPort: 22
})

// 手动解析和转换
const config = loadSshConfig({ configPath: '/path/to/config' })
const bookmark = sshConfigHostToBookmark(config.hosts[0])
```

## API

### `loadAndConvert(options?)`

加载 SSH 配置并转换为 electerm bookmarks。

**选项：**
- `configPath?: string` - 自定义 SSH 配置路径（默认：~/.ssh/config）
- `includeDefaultPaths?: boolean` - 是否包含默认路径（默认：true）
- `defaultUsername?: string` - 如果配置中未指定用户名时的默认值
- `defaultPort?: number` - 默认端口（默认：22）

**返回：** `ElectermBookmarkSsh[]`

### `loadSshConfig(options?)`

加载并解析 SSH 配置文件。

**选项：**
- `configPath?: string` - 自定义 SSH 配置路径
- `includeDefaultPaths?: boolean` - 是否包含默认路径（默认：true）

**返回：** `SshConfig`

### `sshConfigHostToBookmark(host, options?)`

将单个 SSH 配置主机转换为 electerm bookmark。

**参数：**
- `host: SshConfigHost` - SSH 配置主机条目
- `options?: ToBookmarkOptions` - 转换选项

**返回：** `ElectermBookmarkSsh`

## 支持的 SSH 配置选项

- Host、HostName、Port、User
- IdentityFile（支持多个密钥）
- ProxyJump（SSH 跳板机）
- ProxyCommand
- ForwardAgent
- ServerAliveInterval、ServerAliveCountMax
- Compression
- ConnectionAttempts、ConnectTimeout
- TCPKeepAlive
- ControlMaster、ControlPath、ControlPersist
- 等等...

## NPM 脚本

- `npm run build` - 构建 ESM 和 CJS
- `npm run test` - 运行测试
- `npm run lint` - 代码检查
- `npm run lint:fix` - 自动修复代码问题
- `npm run format` - 代码格式化

## 许可证

MIT
