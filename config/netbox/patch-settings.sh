#!/bin/sh
set -eu

SETTINGS_FILE="/opt/netbox/netbox/netbox/settings.py"

python - <<'PY'
import os
from pathlib import Path

path = Path("/opt/netbox/netbox/netbox/settings.py")
content = path.read_text()

cookie_secure = os.getenv("NETBOX_COOKIE_SECURE", "false").lower() in {"1", "true", "yes", "on"}
cookie_samesite = os.getenv("NETBOX_COOKIE_SAMESITE", "Lax")

# Parse CSRF_TRUSTED_ORIGINS from space-separated env var into a proper Python list
trusted_origins_raw = os.getenv("CSRF_TRUSTED_ORIGINS", "")
trusted_origins = trusted_origins_raw.split() if trusted_origins_raw else []

preview_compat = (
    "\n# Local preview compatibility for forwarded HTTPS ports.\n"
    "# Keep Django's CSRF middleware enabled; only tune cookie/proxy settings.\n"
    f"CSRF_COOKIE_SECURE = {cookie_secure}\n"
    f"SESSION_COOKIE_SECURE = {cookie_secure}\n"
    f"CSRF_COOKIE_SAMESITE = {cookie_samesite!r}\n"
    f"SESSION_COOKIE_SAMESITE = {cookie_samesite!r}\n"
    "USE_X_FORWARDED_HOST = True\n"
    "SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')\n"
    + (f"CSRF_TRUSTED_ORIGINS = {trusted_origins!r}\n" if trusted_origins else "")
)
# Always replace the patch block so changes to env vars are picked up on restart
marker = "# Local preview compatibility for forwarded HTTPS ports."
if marker in content:
    idx = content.index(marker)
    start = content.rfind('\n', 0, idx) + 1
    content = content[:start]

content += preview_compat
path.write_text(content)
PY

grep -q "CSRF_COOKIE_SAMESITE" "$SETTINGS_FILE"
grep -q "SESSION_COOKIE_SAMESITE" "$SETTINGS_FILE"
grep -q "Local preview compatibility" "$SETTINGS_FILE"
