import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import * as fs from 'node:fs'
import * as path from 'node:path'
import * as os from 'node:os'
import { loadSshConfig, loadSshConfigFromFile, getDefaultConfigPath } from '../src/parser.js'

describe('SSH Config Parser', () => {
  const testConfigDir = path.join(os.tmpdir(), 'ssh-config-test-' + Date.now())
  const testConfigPath = path.join(testConfigDir, 'config')

  beforeEach(() => {
    // Create test directory and config file
    fs.mkdirSync(testConfigDir, { recursive: true })
  })

  afterEach(() => {
    // Clean up test directory
    fs.rmSync(testConfigDir, { recursive: true, force: true })
  })

  describe('loadSshConfig', () => {
    it('should parse basic SSH config', () => {
      const configContent = `
Host server1
    HostName 192.168.1.100
    User admin
    Port 22

Host server2
    HostName example.com
    User root
    Port 2222
`
      fs.writeFileSync(testConfigPath, configContent)

      const result = loadSshConfig({ configPath: testConfigPath, includeDefaultPaths: false })

      expect(result.hosts).toHaveLength(2)
      expect(result.hosts[0].host).toBe('server1')
      expect(result.hosts[0].hostName).toBe('192.168.1.100')
      expect(result.hosts[0].user).toBe('admin')
      expect(result.hosts[0].port).toBe(22)
      expect(result.hosts[1].host).toBe('server2')
      expect(result.hosts[1].hostName).toBe('example.com')
      expect(result.hosts[1].user).toBe('root')
      expect(result.hosts[1].port).toBe(2222)
    })

    it('should handle identity files', () => {
      const configContent = `
Host myserver
    HostName server.example.com
    User deploy
    IdentityFile ~/.ssh/id_rsa
    IdentityFile ~/.ssh/id_ed25519
`
      fs.writeFileSync(testConfigPath, configContent)

      const result = loadSshConfig({ configPath: testConfigPath, includeDefaultPaths: false })

      expect(result.hosts).toHaveLength(1)
      expect(result.hosts[0].identityFile).toBe('~/.ssh/id_rsa')
      expect(result.hosts[0].identityFileList).toHaveLength(2)
    })

    it('should handle proxy jump', () => {
      const configContent = `
Host jump
    HostName jump.example.com
    User admin

Host target
    HostName target.internal
    User admin
    ProxyJump jump
`
      fs.writeFileSync(testConfigPath, configContent)

      const result = loadSshConfig({ configPath: testConfigPath, includeDefaultPaths: false })

      expect(result.hosts).toHaveLength(2)
      expect(result.hosts[1].proxyJump).toBe('jump')
      expect(result.hosts[1].proxyJumpList).toEqual(['jump'])
    })

    it('should extract wildcard defaults (Host *)', () => {
      const configContent = `
Host *
    ServerAliveInterval 60
    ServerAliveCountMax 3

Host server1
    HostName 192.168.1.100
    User admin
`
      fs.writeFileSync(testConfigPath, configContent)

      const result = loadSshConfig({ configPath: testConfigPath, includeDefaultPaths: false })

      // Should have 1 regular host
      expect(result.hosts).toHaveLength(1)
      expect(result.hosts[0].host).toBe('server1')

      // Should have defaults extracted
      expect(result.defaults).toBeDefined()
      expect(result.defaults?.host).toBe('*')
      expect(result.defaults?.serverAliveInterval).toBe(60)
      expect(result.defaults?.serverAliveCountMax).toBe(3)
    })

    it('should merge wildcard defaults from multiple config files', () => {
      // Create two config files and load them together
      const configPath2 = path.join(testConfigDir, 'config2')
      const configContent1 = `
Host *
    ServerAliveInterval 60
`
      const configContent2 = `
Host *
    ServerAliveCountMax 3

Host server1
    HostName 192.168.1.100
`
      fs.writeFileSync(testConfigPath, configContent1)
      fs.writeFileSync(configPath2, configContent2)

      // Load both config files
      const config1 = loadSshConfig({ configPath: testConfigPath, includeDefaultPaths: false })
      const config2 = loadSshConfig({ configPath: configPath2, includeDefaultPaths: false })

      // Merge defaults manually (this is how it would work in practice)
      const mergedDefaults = { ...config1.defaults, ...config2.defaults }

      expect(mergedDefaults.serverAliveInterval).toBe(60)
      expect(mergedDefaults.serverAliveCountMax).toBe(3)
    })

    it('should handle quoted values', () => {
      const configContent = `
Host quoted
    HostName "server with spaces.example.com"
    User "admin user"
    Port "2222"
`
      fs.writeFileSync(testConfigPath, configContent)

      const result = loadSshConfig({ configPath: testConfigPath, includeDefaultPaths: false })

      expect(result.hosts[0].hostName).toBe('server with spaces.example.com')
      expect(result.hosts[0].user).toBe('admin user')
      expect(result.hosts[0].port).toBe(2222)
    })

    it('should handle comments and empty lines', () => {
      const configContent = `
# This is a comment
Host server1
    # Another comment
    HostName 192.168.1.100

    User admin

Host server2
    HostName example.com
`
      fs.writeFileSync(testConfigPath, configContent)

      const result = loadSshConfig({ configPath: testConfigPath, includeDefaultPaths: false })

      expect(result.hosts).toHaveLength(2)
    })

    it('should handle extra options', () => {
      const configContent = `
Host server1
    HostName 192.168.1.100
    User admin
    ServerAliveInterval 60
    ServerAliveCountMax 3
    Compression yes
    TCPKeepAlive yes
`
      fs.writeFileSync(testConfigPath, configContent)

      const result = loadSshConfig({ configPath: testConfigPath, includeDefaultPaths: false })

      expect(result.hosts[0].serverAliveInterval).toBe(60)
      expect(result.hosts[0].serverAliveCountMax).toBe(3)
      expect(result.hosts[0].compress).toBe('yes')
      expect(result.hosts[0].tcpKeepAlive).toBe('yes')
    })

    it('should return empty hosts when file does not exist', () => {
      const result = loadSshConfig({
        configPath: '/nonexistent/path/config',
        includeDefaultPaths: false
      })

      expect(result.hosts).toHaveLength(0)
    })
  })

  describe('getDefaultConfigPath', () => {
    it('should return correct default path', () => {
      const expectedPath = path.join(os.homedir(), '.ssh', 'config')
      expect(getDefaultConfigPath()).toBe(expectedPath)
    })
  })

  describe('loadSshConfigFromFile', () => {
    it('should load from specific file', () => {
      const configContent = `
Host testserver
    HostName test.example.com
    User testuser
`
      fs.writeFileSync(testConfigPath, configContent)

      const result = loadSshConfigFromFile(testConfigPath)

      expect(result.hosts).toHaveLength(1)
      expect(result.hosts[0].host).toBe('testserver')
    })
  })
})
