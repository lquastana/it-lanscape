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

preview_compat = (
    "\n# Local preview compatibility for forwarded HTTPS ports.\n"
    "# Keep Django's CSRF middleware enabled; only tune cookie/proxy settings.\n"
    f"CSRF_COOKIE_SECURE = {cookie_secure}\n"
    f"SESSION_COOKIE_SECURE = {cookie_secure}\n"
    f"CSRF_COOKIE_SAMESITE = {cookie_samesite!r}\n"
    f"SESSION_COOKIE_SAMESITE = {cookie_samesite!r}\n"
    "USE_X_FORWARDED_HOST = True\n"
    "SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')\n"
)
marker = "# Local preview compatibility for forwarded HTTPS ports."
if marker not in content:
    content += preview_compat

path.write_text(content)
PY

grep -q "CSRF_COOKIE_SAMESITE" "$SETTINGS_FILE"
grep -q "SESSION_COOKIE_SAMESITE" "$SETTINGS_FILE"
grep -q "Local preview compatibility" "$SETTINGS_FILE"
