import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  async redirects() {
    return [
      { source: '/', destination: '/v2', permanent: false },
      { source: '/missions', destination: '/v2', permanent: false },
    ]
  },
}

export default nextConfig
