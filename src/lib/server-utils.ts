import { prisma } from './db'
import { slugify } from './utils'

export async function generateUniqueSlug(name: string): Promise<string> {
  const base = slugify(name) || 'roll'
  let slug = base
  let i = 1
  while (await prisma.roll.findUnique({ where: { slug } })) {
    slug = `${base}-${i++}`
  }
  return slug
}
