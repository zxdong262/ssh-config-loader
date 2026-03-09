import { describe, it, expect } from 'vitest'
import { sshConfigHostToBookmark, sshConfigToBookmarks } from '../src/converter.js'
import type { SshConfigHost } from '../src/types.js'

describe('SSH Config to Bookmark Converter', () => {
  describe('sshConfigHostToBookmark', () => {
    it('should convert basic SSH config to bookmark', () => {
      const host: SshConfigHost = {
        host: 'server1',
        hostName: '192.168.1.100',
        user: 'admin',
        port: 22
      }

      const result = sshConfigHostToBookmark(host)

      expect(result.type).toBe('ssh')
      expect(result.host).toBe('192.168.1.100')
      expect(result.port).toBe(22)
      expect(result.username).toBe('admin')
      expect(result.authType).toBe('privateKey')
      expect(result.title).toBe('server1')
    })

    it('should not set hasHopping when there is no proxyJump', () => {
      const host: SshConfigHost = {
        host: 'server1',
        hostName: '192.168.1.100',
        user: 'admin',
        port: 22
      }

      const result = sshConfigHostToBookmark(host)

      expect(result.hasHopping).toBeUndefined()
    })

    it('should use hostname as host if hostName is not set', () => {
      const host: SshConfigHost = {
        host: 'server1'
      }

      const result = sshConfigHostToBookmark(host, { defaultUsername: 'root' })

      expect(result.host).toBe('server1')
      expect(result.username).toBe('root')
    })

    it('should use defaultUsername option', () => {
      const host: SshConfigHost = {
        host: 'server1',
        hostName: '192.168.1.100'
      }

      const result = sshConfigHostToBookmark(host, { defaultUsername: 'deploy' })

      expect(result.username).toBe('deploy')
    })

    it('should use defaultPort option', () => {
      const host: SshConfigHost = {
        host: 'server1',
        hostName: '192.168.1.100',
        user: 'admin'
      }

      const result = sshConfigHostToBookmark(host, { defaultPort: 2222 })

      expect(result.port).toBe(2222)
    })

    it('should include description when hostName differs from host', () => {
      const host: SshConfigHost = {
        host: 'myalias',
        hostName: 'real-server.example.com',
        user: 'admin'
      }

      const result = sshConfigHostToBookmark(host)

      expect(result.description).toBe('SSH to real-server.example.com')
    })

    it('should handle proxy jump', () => {
      const host: SshConfigHost = {
        host: 'target',
        hostName: 'target.internal',
        user: 'admin',
        proxyJump: 'jump.example.com'
      }

      const result = sshConfigHostToBookmark(host)

      expect(result.connectionHoppings).toBeDefined()
      expect(result.connectionHoppings).toHaveLength(1)
      expect(result.connectionHoppings?.[0].host).toBe('jump.example.com')
      expect(result.connectionHoppings?.[0].username).toBe('admin')
      expect(result.hasHopping).toBe(true)
    })

    it('should handle multiple proxy jumps', () => {
      const host: SshConfigHost = {
        host: 'target',
        hostName: 'target.internal',
        user: 'admin',
        proxyJumpList: ['jump1.example.com', 'jump2.example.com']
      }

      const result = sshConfigHostToBookmark(host)

      expect(result.connectionHoppings).toHaveLength(2)
      expect(result.connectionHoppings?.[0].host).toBe('jump1.example.com')
      expect(result.connectionHoppings?.[1].host).toBe('jump2.example.com')
      expect(result.hasHopping).toBe(true)
    })

    it('should resolve jump host details when hosts array is provided', () => {
      const hosts: SshConfigHost[] = [
        {
          host: 'jump',
          hostName: 'bastion.example.com',
          user: 'jumpuser',
          port: 22
        },
        {
          host: 'internal',
          hostName: '10.0.0.5',
          user: 'admin',
          proxyJump: 'jump'
        }
      ]

      const result = sshConfigHostToBookmark(hosts[1], { hosts })

      expect(result.connectionHoppings).toBeDefined()
      expect(result.connectionHoppings).toHaveLength(1)
      // Should resolve to actual hostname, not the alias
      expect(result.connectionHoppings?.[0].host).toBe('bastion.example.com')
      expect(result.connectionHoppings?.[0].username).toBe('jumpuser')
      expect(result.connectionHoppings?.[0].port).toBe(22)
      expect(result.hasHopping).toBe(true)
    })

    it('should apply wildcard defaults to host', () => {
      const host: SshConfigHost = {
        host: 'server1',
        hostName: '192.168.1.100'
      }

      const defaults: SshConfigHost = {
        host: '*',
        user: 'defaultuser',
        extraOptions: {
          serverAliveInterval: 60,
          serverAliveCountMax: 3
        }
      }

      const result = sshConfigHostToBookmark(host, { defaults })

      expect(result.username).toBe('defaultuser')
      expect(result.description).toContain('serverAliveInterval=60')
      expect(result.description).toContain('serverAliveCountMax=3')
    })

    it('should let host-specific values override wildcard defaults', () => {
      const host: SshConfigHost = {
        host: 'server1',
        hostName: '192.168.1.100',
        user: 'specificuser',
        extraOptions: {
          serverAliveInterval: 120
        }
      }

      const defaults: SshConfigHost = {
        host: '*',
        user: 'defaultuser',
        extraOptions: {
          serverAliveInterval: 60,
          serverAliveCountMax: 3
        }
      }

      const result = sshConfigHostToBookmark(host, { defaults })

      expect(result.username).toBe('specificuser')
      expect(result.description).toContain('serverAliveInterval=120')
      // serverAliveCountMax should still come from defaults
      expect(result.description).toContain('serverAliveCountMax=3')
    })

    it('should apply wildcard defaults to proxy jump hosts', () => {
      const hosts: SshConfigHost[] = [
        {
          host: 'jump',
          hostName: 'bastion.example.com'
          // No user specified, should use default
        },
        {
          host: 'internal',
          hostName: '10.0.0.5',
          proxyJump: 'jump'
        }
      ]

      const defaults: SshConfigHost = {
        host: '*',
        user: 'defaultuser'
      }

      const result = sshConfigHostToBookmark(hosts[1], { hosts, defaults })

      expect(result.connectionHoppings).toBeDefined()
      expect(result.connectionHoppings?.[0].host).toBe('bastion.example.com')
      // Should use default user for jump host
      expect(result.connectionHoppings?.[0].username).toBe('defaultuser')
    })

    it('should handle proxy command', () => {
      const host: SshConfigHost = {
        host: 'server1',
        hostName: '192.168.1.100',
        user: 'admin',
        proxyCommand: 'nc -X 5 -p 1080 %h %p'
      }

      const result = sshConfigHostToBookmark(host)

      expect(result.description).toContain('Proxy: nc -X 5 -p 1080 %h %p')
    })

    it('should handle forward agent', () => {
      const host: SshConfigHost = {
        host: 'server1',
        hostName: '192.168.1.100',
        user: 'admin',
        forwardAgent: 'yes'
      }

      const result = sshConfigHostToBookmark(host)

      expect(result.useSshAgent).toBe(true)
    })

    it('should handle extra options', () => {
      const host: SshConfigHost = {
        host: 'server1',
        hostName: '192.168.1.100',
        user: 'admin',
        extraOptions: {
          serverAliveInterval: 60,
          compression: 'yes'
        }
      }

      const result = sshConfigHostToBookmark(host)

      expect(result.description).toContain('serverAliveInterval=60')
      expect(result.description).toContain('compression=yes')
    })
  })

  describe('sshConfigToBookmarks', () => {
    it('should convert multiple hosts', () => {
      const hosts: SshConfigHost[] = [
        { host: 'server1', hostName: '192.168.1.100', user: 'admin' },
        { host: 'server2', hostName: '192.168.1.101', user: 'root', port: 2222 }
      ]

      const results = sshConfigToBookmarks(hosts)

      expect(results).toHaveLength(2)
      expect(results[0].title).toBe('server1')
      expect(results[1].title).toBe('server2')
      expect(results[1].port).toBe(2222)
    })
  })
})
