import type { CollectionConfig } from 'payload'

export const Users: CollectionConfig = {
  slug: 'users',
  admin: {
    useAsTitle: 'email',
  },
  auth: {
    useAPIKey: true, // 👈 Enables API key generation for this collection
  },
  fields: [
    // Email added by default
    // Add more fields as needed
  ],
}
