// backend/ecosystem.config.js — Configuración PM2
module.exports = {
  apps: [
    {
      name: 'erp-psi-backend',
      script: 'index.js',
      cwd: __dirname,
      instances: 1,
      exec_mode: 'fork',

      // ─── Memoria ────────────────────────────────────────────────────────────
      // Heap máximo 512 MB — evita OOM en operaciones de facturación masiva
      node_args: '--max-old-space-size=512',
      // Reiniciar si supera 400 MB de RAM total (safety net)
      max_memory_restart: '400M',

      // ─── Entorno ────────────────────────────────────────────────────────────
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },

      // ─── Logs ───────────────────────────────────────────────────────────────
      out_file:   './logs/pm2-out.log',
      error_file: './logs/pm2-error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      merge_logs: true,

      // ─── Reinicio automático ────────────────────────────────────────────────
      autorestart: true,
      watch: false,
      restart_delay: 3000,
      max_restarts: 10,
      min_uptime: '10s',
    },
  ],
};
