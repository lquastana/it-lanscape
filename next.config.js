/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async redirects() {
    return [
      {
        source: '/incidents',
        destination: '/incident',
        permanent: false,
      },
      {
        source: '/simulation-incident',
        destination: '/incident',
        permanent: false,
      },
      {
        source: '/simulation',
        destination: '/incident',
        permanent: false,
      },
    ];
  },
  async headers() {
    return [
      {
        source: '/_next/static/chunks/:path*',
        headers: [
          { key: 'Content-Type', value: 'application/javascript; charset=utf-8' },
        ],
      },
      {
        source: '/_next/static/runtime/:path*',
        headers: [
          { key: 'Content-Type', value: 'application/javascript; charset=utf-8' },
        ],
      },
      {
        source: '/_next/static/development/:path*',
        headers: [
          { key: 'Content-Type', value: 'application/javascript; charset=utf-8' },
        ],
      },
    ];
  },
};

export default nextConfig;
