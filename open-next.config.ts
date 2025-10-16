export default {
  default: {
    appPath: './',
    packageJsonPath: './package.json',
    buildCommand: 'npm run build',
    command: 'npm run build',
    // Cloudflare overrides for the default server function
    override: {
      wrapper: 'cloudflare-node',
      converter: 'edge',
      proxyExternalRequest: 'fetch',
      incrementalCache: 'dummy',
      tagCache: 'dummy',
      queue: 'dummy',
    },
  },
  // Externalize node:crypto for Workers compatibility if needed by Next 15
  edgeExternals: ['node:crypto'],
  // Middleware runs at the edge in CF
  middleware: {
    external: true,
    override: {
      wrapper: 'cloudflare-edge',
      converter: 'edge',
      proxyExternalRequest: 'fetch',
      incrementalCache: 'dummy',
      tagCache: 'dummy',
      queue: 'dummy',
    },
  },
  imageOptimization: {
    loader: 'cloudflare',
  },
  experimental: {
    disableIncrementalCache: false,
  },
};
