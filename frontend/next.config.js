/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  async rewrites() {
    return [
      {
        source: '/mapbox/:path*',
        destination: 'https://api.mapbox.com/:path*',
      },
      {
        source: '/mapbox-tiles/:path*',
        destination: 'https://tiles.mapbox.com/:path*',
      },
    ]
  },
}

module.exports = nextConfig