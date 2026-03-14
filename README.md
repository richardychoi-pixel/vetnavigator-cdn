# VetNavigator AI — CDN Repository

This repository hosts the embeddable chatbot widget for VetNavigator AI.

## File Structure

```
chatbot/
  v1/
    widget.js       ← Main embeddable widget (upload from outputs folder)
```

## Cloudflare Pages Setup

1. Connect this repo to Cloudflare Pages
2. Project name: `vetnavigator-cdn`
3. Build command: (leave blank)
4. Build output: (leave blank)
5. Add custom domain: `cdn.vetnavigator.ai`

## Client Embed Snippet

Each client gets a unique snippet. Replace values with their actual info:

```html
<script>
  window.VetNavigatorConfig = {
    licenseKey: 'VN-BASIC-XXXXXX',     // ← generated per client
    orgName:    'American Legion Post 45',
    city:       'Hartford, CT',
    phone:      '(860) 555-0100',
    address:    '123 Main St, Hartford CT 06101',
    hours:      'Mon–Fri 9am–5pm',
    webhook:    'https://YOUR-GHL-WEBHOOK-URL'
  };
</script>
<script src="https://cdn.vetnavigator.ai/chatbot/v1/widget.js" defer></script>
```

## WordPress Install

Upload `vetnavigator-widget.php` to `wp-content/plugins/` and activate.
Then paste the config block into the site's header or use the plugin settings page.

## License Key Format

| Plan     | Key Format              | Multilingual Add-on         |
|----------|-------------------------|-----------------------------|
| Basic    | `VN-BASIC-XXXXXX`       | `VN-BASIC-ML-XXXXXX`        |
| Starter  | `VN-STARTER-XXXXXX`     | `VN-STARTER-ML-XXXXXX`      |
| Standard | `VN-STANDARD-XXXXXX`    | Included — no ML suffix     |
| Premium  | `VN-PREMIUM-XXXXXX`     | Included — no ML suffix     |
| Demo     | `VN-DEMO`               | All features unlocked       |

## Version History

- v1.0.0 — Initial release (March 2026)
