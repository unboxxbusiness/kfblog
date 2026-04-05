'use client'

import * as React from 'react'
import { addRecentlyViewed } from '../lib/browserStorage'

export default function TrackRecentlyViewed({ slug }: { slug: string }) {
  React.useEffect(() => {
    addRecentlyViewed(slug)
  }, [slug])

  return null
}
