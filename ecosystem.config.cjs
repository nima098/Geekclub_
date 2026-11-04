module.exports = {
  apps: [
    {
      name: 'geekclub',
      script: 'server.ts',
      interpreter: 'node_modules/.bin/tsx',
      env: {
        NODE_ENV: 'production',
        PORT: process.env.PORT || 3000
      },
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '500M'
    }
  ]
};
