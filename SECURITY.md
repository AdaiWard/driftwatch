# Security policy

## Supported versions

DriftWatch is pre-1.0 software. Security fixes are applied to the latest commit on `main`; there are no supported release branches yet.

## Reporting a vulnerability

Please do not open a public issue for a suspected vulnerability. Use GitHub's **Report a vulnerability** private reporting feature after the repository is published. If private reporting is unavailable, contact the repository owner privately.

Include the affected commit, impact, reproduction steps, and any suggested mitigation. Avoid including real credentials or private screenshots.

## Deployment warning

The current MVP is intended for trusted, self-hosted environments. In particular:

- project creation is unauthenticated;
- capture URLs can point to resources reachable by the worker;
- the filesystem image route is not authenticated;
- API rate limiting and tenant administration are not implemented;
- the credentials in `docker-compose.yml` are development-only defaults.

Do not expose the current deployment directly to the public internet. Put it behind network access controls and replace all default credentials. Restrict worker egress to reduce server-side request forgery risk.
