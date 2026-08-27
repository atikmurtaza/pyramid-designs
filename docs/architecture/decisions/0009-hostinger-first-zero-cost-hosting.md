# ADR 0009: Hostinger-first zero-cost hosting

**Status:** Accepted

Deploy the portable Node.js Next.js application on the owner's existing Hostinger account, provided the actual subscription exposes the managed Node.js Web App facility on Business Web or Cloud hosting. Do not adopt Vercel for production.

Use ordinary Next.js server behaviour and hPanel GitHub deployment, environment variables, logs/restart controls and UTC cron. Do not depend on Vercel-specific APIs. App Router/SSR/route handlers/Server Actions/ISR/cache behaviour and cron invocation are verified on the exact plan with synthetic data before implementation relies on them.

If the existing plan cannot provide the required Node.js web-app facility without an upgrade, stop and obtain owner approval before changing the hosting cost or architecture.
