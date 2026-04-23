import sharp from 'sharp'
import { readFileSync } from 'fs'
import { mkdir } from 'fs/promises'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')
const svg = readFileSync(join(root, 'public', 'icon.svg'))

await mkdir(join(root, 'public', 'icons'), { recursive: true })

await sharp(svg).resize(192, 192).png().toFile(join(root, 'public', 'icons', 'icon-192.png'))
console.log('✓ icon-192.png')

await sharp(svg).resize(512, 512).png().toFile(join(root, 'public', 'icons', 'icon-512.png'))
console.log('✓ icon-512.png')

await sharp(svg).resize(180, 180).png().toFile(join(root, 'public', 'icons', 'apple-touch-icon.png'))
console.log('✓ apple-touch-icon.png')

await sharp(svg).resize(32, 32).png().toFile(join(root, 'public', 'favicon.png'))
console.log('✓ favicon.png')

console.log('All icons generated.')
