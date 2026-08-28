# Canonical host: www → apex

Canonical host: `https://setareganplus.ir`

Do **not** apply blindly. Merge into the existing nginx vhosts and keep current SSL certificate paths.

## Recommended www redirect

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name www.setareganplus.ir;
    return 301 https://setareganplus.ir$request_uri;
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name www.setareganplus.ir;

    # Preserve the existing valid SSL certificate directives here.
    # ssl_certificate     ...;
    # ssl_certificate_key ...;

    return 301 https://setareganplus.ir$request_uri;
}
```

## Apply safely

```bash
sudo nginx -t
sudo systemctl reload nginx
```

## Verify

```bash
curl -I https://www.setareganplus.ir
# Expect: 301 Location: https://setareganplus.ir/...
curl -I https://setareganplus.ir
# Expect: 200
```
