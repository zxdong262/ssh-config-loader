import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import * as fs from 'node:fs'
import * as path from 'node:path'
import * as os from 'node:os'
import { loadAndConvert } from '../src/index.js'

describe('Integration', () => {
  const testConfigDir = path.join(os.tmpdir(), 'ssh-config-integration-test-' + Date.now())
  const testConfigPath = path.join(testConfigDir, 'config')

  beforeEach(() => {
    fs.mkdirSync(testConfigDir, { recursive: true })
  })

  afterEach(() => {
    fs.rmSync(testConfigDir, { recursive: true, force: true })
  })

  describe('loadAndConvert', () => {
    it('should load and convert SSH config to bookmarks', () => {
      const configContent = `
Host server1
    HostName 192.168.1.100
    User admin

Host server2
    HostName example.com
    User root
    Port 2222
`
      fs.writeFileSync(testConfigPath, configContent)

      const bookmarks = loadAndConvert({
        configPath: testConfigPath,
        includeDefaultPaths: false,
        defaultUsername: 'default'
      })

      console.log('Test 1 - Basic conversion result:', JSON.stringify(bookmarks, null, 2))

      expect(bookmarks).toHaveLength(2)
      expect(bookmarks[0].type).toBe('ssh')
      expect(bookmarks[0].host).toBe('192.168.1.100')
      expect(bookmarks[0].username).toBe('admin')
      expect(bookmarks[1].host).toBe('example.com')
      expect(bookmarks[1].port).toBe(2222)
    })

    it('should use defaultUsername when not provided in config', () => {
      const configContent = `
Host server1
    HostName 192.168.1.100
`
      fs.writeFileSync(testConfigPath, configContent)

      const bookmarks = loadAndConvert({
        configPath: testConfigPath,
        includeDefaultPaths: false,
        defaultUsername: 'myuser'
      })

      console.log('Test 2 - Default username result:', JSON.stringify(bookmarks, null, 2))

      expect(bookmarks).toHaveLength(1)
      expect(bookmarks[0].username).toBe('myuser')
    })

    it('should use defaultPort when not provided in config', () => {
      const configContent = `
Host server1
    HostName 192.168.1.100
`
      fs.writeFileSync(testConfigPath, configContent)

      const bookmarks = loadAndConvert({
        configPath: testConfigPath,
        includeDefaultPaths: false,
        defaultPort: 2200
      })

      console.log('Test 3 - Default port result:', JSON.stringify(bookmarks, null, 2))

      expect(bookmarks).toHaveLength(1)
      expect(bookmarks[0].port).toBe(2200)
    })
  })
})
