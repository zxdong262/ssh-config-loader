import { describe, it, expect } from 'vitest'
import * as fs from 'node:fs'
import * as path from 'node:path'
import { loadAndConvert } from '../src/index.js'

describe('Full Config Test', () => {
  it('should convert full config to electerm bookmarks and save to file', () => {
    const configPath = path.join(__dirname, 'full-config')
    const outputPath = path.join(__dirname, 'full-electerm-bookmarks.json')

    const bookmarks = loadAndConvert({
      configPath,
      includeDefaultPaths: false,
      defaultUsername: 'defaultuser'
    })

    // Save to JSON file
    fs.writeFileSync(outputPath, JSON.stringify(bookmarks, null, 2))

    console.log('Full config conversion result saved to:', outputPath)
    console.log('Number of hosts parsed:', bookmarks.length)

    // Verify we got all hosts
    expect(bookmarks.length).toBeGreaterThan(0)

    // Verify structure of first bookmark
    const firstBookmark = bookmarks[0]
    expect(firstBookmark).toHaveProperty('type', 'ssh')
    expect(firstBookmark).toHaveProperty('host')
    expect(firstBookmark).toHaveProperty('username')
    expect(firstBookmark).toHaveProperty('authType')
    expect(firstBookmark).toHaveProperty('title')

    console.log('First bookmark:', JSON.stringify(firstBookmark, null, 2))
  })
})
