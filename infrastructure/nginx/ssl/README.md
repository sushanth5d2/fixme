# SSL certificates for Nginx
# For production: use Let's Encrypt (certbot) or your CA-issued certificates
# For local dev: generate self-signed certificates with:
#
#   openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
#     -keyout api.key -out api.crt \
#     -subj "/C=IN/ST=Karnataka/L=Bengaluru/O=FixMe/CN=api.fixme.in"
#
#   openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
#     -keyout admin.key -out admin.crt \
#     -subj "/C=IN/ST=Karnataka/L=Bengaluru/O=FixMe/CN=admin.fixme.in"
#
# Files expected:
#   api.crt, api.key, admin.crt, admin.key
#
# ⚠️ Certificate files are gitignored for security.
