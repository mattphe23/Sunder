# islandroadco.com — Island Road Studios

Static site. Three pages, no build step, no dependencies.

| File | Serves as |
|---|---|
| `index.html` | The company site Apple checks during Organization enrolment |
| `support.html` | The **Support URL** required by App Store Connect |
| `privacy.html` | The **Privacy Policy URL** required by App Store Connect |

## Deploying

Nothing is compiled. The only moving part is a static file server.

### Railway (current)

Set the service's **Root Directory** to `site`. Nixpacks then reads
`site/package.json`, installs `serve`, and runs `npm start`, which binds
Railway's injected `$PORT`:

```
serve . -l ${PORT:-8080}
```

That is why the package.json exists — without it Railway falls back to the
repo root, which builds and starts **Sunder's Express server** instead of this
site. The tell is `/privacy.html`: the game has a `/privacy` SPA route but
nothing at `/privacy.html`, so that URL 404s under the wrong deploy and returns
200 under the right one.

When Railway asks for a **port**, it is asking which port inside the container
to route to. Leave it on whatever Railway detects — the start command binds
`$PORT`, so hardcoding a number will break routing.

`serve.json` sets `cleanUrls: false` on purpose. Without it `serve` redirects
`/support.html` to `/support`, which works but puts a 301 in front of every
internal link and in front of the URLs registered in App Store Connect. With it
off, the `.html` paths return 200 directly, exactly as they would on Cloudflare
Pages, Netlify or any other static host — so the site behaves the same if it
ever moves.

### Any static host (Cloudflare Pages, Netlify, Vercel)

Build command empty, output directory `site`. `package.json` and `serve.json`
are ignored by these and do no harm.

## Before Apple verification

Apple checks that the site is publicly reachable, functional, and on the same
domain as the work email on the account. Two things to finish first:

- **`support@islandroadco.com` must actually receive mail.** A published address
  that bounces is worse than none, and it is the address a reviewer may use.
- **The registered legal name is in the footer** of all three pages: "Island
  Road Studios LLC". This exists because the trading name ("Island Road
  Studios") does not match the domain (`islandroadco.com`), and a reviewer
  verifying that the domain belongs to the organization is the person most
  likely to query that. If the entity is ever renamed, change it here too.

## Keeping the privacy policy in step

`privacy.html` and the in-app policy at `client/src/pages/Privacy.tsx` describe
the same behaviour and are maintained by hand. If one changes, change both —
the in-app copy is what a player reads, this one is what App Store Connect
links to, and they must not disagree.
