import path from 'path';

/** @type {import('next').NextConfig} */
const nextConfig = {
  turbopack: {
    root: import.meta.dirname,
    resolveAlias: {
      '@react-native-async-storage/async-storage': path.resolve(import.meta.dirname, 'lib/empty.ts'),
      'pino-pretty': path.resolve(import.meta.dirname, 'lib/empty.ts'),
      'lokijs':      path.resolve(import.meta.dirname, 'lib/empty.ts'),
      'encoding':    path.resolve(import.meta.dirname, 'lib/empty.ts'),
    },
  },
};

export default nextConfig;
