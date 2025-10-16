export default {
  // Target Cloudflare Workers output
  platform: "cloudflare",
  command: "npm run build",
  openNextVersion: "3.1.3",
  buildCommand: "npm run build",
  packageJsonPath: "./package.json",
  appPath: "./",
  queue: {
    consumer: {
      name: "queue-consumer",
    },
  },
  imageOptimization: {
    loader: "cloudflare",
  },
  experimental: {
    disableIncrementalCache: false,
  },
};
