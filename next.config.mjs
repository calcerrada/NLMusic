/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  turbopack: {
    resolveAlias: {
      '@strudel/core': './node_modules/@strudel/core',
    },
  },
};

export default nextConfig;
