module.exports = {
  apps: [
    {
      name: "alola",
      script: "node_modules/next/dist/bin/next",
      args: "start -p 3001",
      cwd: __dirname,
      instances: 1,
      autorestart: true,
      max_restarts: 10,
      env: { NODE_ENV: "production" },
      out_file: "C:/Users/77C6~1/AppData/Local/Temp/opencode/alola-pm2.out.log",
      error_file: "C:/Users/77C6~1/AppData/Local/Temp/opencode/alola-pm2.err.log",
      merge_logs: true,
    },
  ],
};
