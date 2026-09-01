# islandroadco.com — Island Road Studios

Static site. Three pages, no build step, no dependencies.

| File | Serves as |
|---|---|
| `index.html` | The company site Apple checks during Organization enrolment |
| `support.html` | The **Support URL** required by App Store Connect |
| `privacy.html` | The **Privacy Policy URL** required by App Store Connect |

## Deploying to Cloudflare Pages

1. Cloudflare dashboard → **Workers & Pages** → **Create** → **Pages** → connect this repo.
2. **Build command:** leave empty. **Build output directory:** `site`.
3. **Custom domains** → add `islandroadco.com` and `www.islandroadco.com`.

Nothing is compiled, so the deploy is a file copy.

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
