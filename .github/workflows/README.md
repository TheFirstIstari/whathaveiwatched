# Deployment workflow

`deploy-frontend.yml` deploys `frontend/` to the home server on every push to `main`.

Required GitHub repository secrets:

- `TAILSCALE_AUTHKEY` — ephemeral/reusable auth key for GitHub Actions runner to join tailnet
- `DEPLOY_HOST` — home server Tailscale IP or MagicDNS name, e.g. `100.82.166.71`
- `DEPLOY_USER` — SSH user, e.g. `root`
- `DEPLOY_SSH_KEY` — private SSH key allowed to write `DEPLOY_PATH` and restart pm2

Optional secrets:

- `DEPLOY_PORT` — SSH port, defaults to `22`
- `DEPLOY_PATH` — defaults to `/opt/whathaveiwatched`
- `PM2_PROCESS` — defaults to `whathaveiwatched`

Server assumptions:

- Node/npm installed
- pm2 installed globally or available in deploy user's PATH
- `DEPLOY_PATH/.env.local` already exists on server and is not overwritten
- `npm ci && npm run build && pm2 restart <process>` works in `DEPLOY_PATH`
