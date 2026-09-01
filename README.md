# Archipools Pool Services

A responsive Astro landing page for a North Dallas pool maintenance company.

## Local development

```sh
npm install
npm run dev -- --host 0.0.0.0
```

Astro will serve the site at `http://localhost:4321`.

## Share the preview

With the local development server running, open a second terminal:

```sh
cloudflared tunnel --url http://localhost:4321
```

Send the temporary `trycloudflare.com` URL to your review partner. The URL works
only while the local server, tunnel process, laptop, and internet connection
remain active.

## Production build

```sh
npm run build
```

The generated static site is written to `dist/`.

## Before launch

- Replace `hello@example.com` with the real business email address.
- Replace the working company name if a final brand name is selected.
- Add real pool/project photography when it becomes available.
- Add final promotion terms, business phone number, privacy policy, and analytics.
