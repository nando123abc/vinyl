/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'coverartarchive.org' },
      { protocol: 'http',  hostname: 'coverartarchive.org' }, // if some URLs are http
    ],
  },
};

export default nextConfig;
