#!/usr/bin/env bash
# ============================================================
# 家宴小本子服务端 — 一键部署脚本
# 适用：常见 Linux 发行版（Ubuntu/Debian/CentOS/麒麟等）
# 使用：chmod +x deploy.sh && sudo ./deploy.sh
# ============================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
APP_NAME="jiayan-server"
APP_DIR="/opt/${APP_NAME}"
APP_USER="jiayan"
ENV_FILE="${SCRIPT_DIR}/.env"

# ---------- 颜色 ----------
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log()  { echo -e "${GREEN}[INFO]${NC}  $*"; }
warn() { echo -e "${YELLOW}[WARN]${NC}  $*"; }
err()  { echo -e "${RED}[ERROR]${NC} $*"; exit 1; }

# ---------- 权限检查 ----------
if [[ $EUID -ne 0 ]]; then
  err "请使用 sudo 运行此脚本。"
fi

# ---------- 环境变量检查 ----------
if [[ ! -f "${ENV_FILE}" ]]; then
  warn ".env 文件不存在，正在从 .env.example 创建…"
  cp "${SCRIPT_DIR}/.env.example" "${ENV_FILE}"
  warn "请编辑 ${ENV_FILE} 填入实际配置后重新运行本脚本。"
  exit 0
fi

# 检查是否仍是示例值
if grep -q 'wx_your_app_id_here' "${ENV_FILE}" 2>/dev/null; then
  warn "检测到 .env 中仍为示例 AppID。"
  warn "如果是测试部署，请设置 WECHAT_TEST_MODE=true。"
fi

# ---------- 系统依赖 ----------
log "检查系统依赖 (Node.js, Nginx)..."

install_nodejs() {
  if command -v node &>/dev/null; then
    local NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
    if [[ "$NODE_VERSION" -ge 20 ]]; then
      log "Node.js $(node -v) 已满足要求。"
      return
    fi
  fi
  warn "安装 Node.js 20+ …"
  if command -v apt-get &>/dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y nodejs
  elif command -v yum &>/dev/null; then
    curl -fsSL https://rpm.nodesource.com/setup_20.x | bash -
    yum install -y nodejs
  else
    err "未检测到 apt-get 或 yum，请手动安装 Node.js 20+。"
  fi
}

install_nginx() {
  if command -v nginx &>/dev/null; then
    log "Nginx 已安装。"
    return
  fi
  warn "安装 Nginx…"
  if command -v apt-get &>/dev/null; then
    apt-get update && apt-get install -y nginx
  elif command -v yum &>/dev/null; then
    yum install -y nginx
  else
    warn "请手动安装 Nginx。"
  fi
}

install_nodejs
install_nginx

# ---------- 创建系统用户 ----------
if ! id -u "${APP_USER}" &>/dev/null; then
  log "创建系统用户 ${APP_USER}…"
  useradd --system --no-create-home --shell /usr/sbin/nologin "${APP_USER}"
fi

# ---------- 部署应用 ----------
log "部署应用到 ${APP_DIR}…"
mkdir -p "${APP_DIR}"
# 排除 node_modules、data、test、.git 等
rsync -a --delete \
  --exclude='node_modules' \
  --exclude='data' \
  --exclude='test' \
  --exclude='.git' \
  --exclude='*.db' \
  --exclude='*.db-wal' \
  --exclude='*.db-shm' \
  "${SCRIPT_DIR}/" "${APP_DIR}/"

# 复制 .env（不覆盖目标已有的）
cp -n "${ENV_FILE}" "${APP_DIR}/.env" 2>/dev/null || true

# 创建数据目录
mkdir -p "${APP_DIR}/data"
chown -R "${APP_USER}:${APP_USER}" "${APP_DIR}"

# ---------- 安装依赖 ----------
log "安装 npm 依赖…"
cd "${APP_DIR}"
npm ci --omit=dev 2>/dev/null || npm install --omit=dev

# ---------- systemd 服务 ----------
log "配置 systemd 服务…"
cat > /etc/systemd/system/${APP_NAME}.service << SYSTEMD
[Unit]
Description=家宴小本子服务端
After=network.target

[Service]
Type=simple
User=${APP_USER}
WorkingDirectory=${APP_DIR}
EnvironmentFile=${APP_DIR}/.env
ExecStart=/usr/bin/node ${APP_DIR}/server.js
Restart=always
RestartSec=5
StandardOutput=journal
StandardError=journal
SyslogIdentifier=${APP_NAME}

[Install]
WantedBy=multi-user.target
SYSTEMD

systemctl daemon-reload
systemctl enable "${APP_NAME}"

# ---------- Nginx 反代 ----------
log "配置 Nginx 反向代理…"
cat > /etc/nginx/sites-available/${APP_NAME} << 'NGINX'
# 家宴小本子 API 反向代理
# 请将 server_name 替换为您的实际域名

server {
    listen 80;
    server_name jiayan-api.example.com;

    # 如需 HTTPS，请取消以下注释并使用 certbot 配置
    # listen 443 ssl;
    # ssl_certificate     /etc/letsencrypt/live/jiayan-api.example.com/fullchain.pem;
    # ssl_certificate_key /etc/letsencrypt/live/jiayan-api.example.com/privkey.pem;

    client_max_body_size 2m;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
NGINX

# 启用站点（Debian/Ubuntu）
if [[ -d /etc/nginx/sites-enabled ]]; then
  ln -sf /etc/nginx/sites-available/${APP_NAME} /etc/nginx/sites-enabled/${APP_NAME}
  # 移除默认站点（可选）
  rm -f /etc/nginx/sites-enabled/default
fi

# Nginx 配置测试
if nginx -t 2>&1; then
  systemctl reload nginx
else
  warn "Nginx 配置测试失败，请检查 /etc/nginx/sites-available/${APP_NAME}"
fi

# ---------- 启动服务 ----------
log "启动服务…"
systemctl restart "${APP_NAME}"

sleep 2
if systemctl is-active --quiet "${APP_NAME}"; then
  log "部署完成！"
  log "健康检查: curl http://127.0.0.1:3000/health"
else
  warn "服务可能未正常启动，请检查日志: journalctl -u ${APP_NAME} -n 50"
fi
