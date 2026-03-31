import { createRequire } from 'module';

const require = createRequire(import.meta.url);

const nextConfig = {
  output: 'standalone',
  env: {
    NEXT_PUBLIC_API_URL:
      process.env.NEXT_PUBLIC_API_URL || 'http://localhost',
  },
};

export default nextConfig;