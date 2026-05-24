# Orb

**Advanced OSINT Intelligence.** Real-time situational awareness across conflict zones, markets, military activity, and critical infrastructure — in a single dark-themed dashboard.

[![License: AGPL v3](https://img.shields.io/badge/License-AGPL%20v3-blue.svg)](./LICENSE)
[![Non-commercial](https://img.shields.io/badge/operated-non--commercial-success)](#non-commercial-status)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=flat&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)

> **This is a fork.** Orb is derived from [koala73/worldmonitor](https://github.com/koala73/worldmonitor)
> (World Monitor, © 2024-2026 Elie Habib), with substantial modifications. See
> [Attribution & License](#attribution--license) below for full details on what
> changed and how this satisfies the AGPL-3.0 obligations of the upstream work.

## Non-commercial Status

Orb is a **non-commercial public-interest project** operated by
[Parallax AI](https://github.com/parallax-ai-llc). The hosted instance at
`orb.parallax.kr` is offered free of charge with no ads, no paywall, no
subscription tier, and no user data sold or monetized. There are no plans to
introduce commercial features in this codebase — it exists solely as a public
situational-awareness utility.

## Roadmap — Parallax AI Analysis Integration

Future releases will progressively add **proprietary analysis layers produced
by Parallax AI** on top of the open OSINT base:

- AI-synthesized regional briefings and convergence reports
- Cross-source correlation signals (military / economic / disaster cascades)
- Country instability scoring with Parallax-specific risk models
- Forecast / scenario modeling with explainable confidence intervals
- Long-form intelligence summaries published as periodic data drops

These additions will ship under the same AGPL-3.0 license as the rest of the
project. The analysis content itself (datasets, scoring outputs, briefs) is
provided for **research and public-interest use only**; downstream commercial
redistribution requires written permission from Parallax AI.

---

## What Orb Is

A single-purpose OSINT console focused on situational awareness:

- **Real-time conflict tracking** (ACLED, UCDP)
- **Military ADS-B flight monitoring**
- **Maritime AIS ship tracking**
- **NASA FIRMS satellite fire detection**
- **Nuclear and critical infrastructure mapping**
- **Submarine cable and internet outage monitoring**
- **Country Instability Index (CII)** scoring
- **Stock market, commodity, and crypto** tracking
- **Earthquake and natural disaster** alerts
- **Cyber threat detection**

5 dashboard variants (`Global`, `Tech`, `Finance`, `Commodity`, `Energy`) share one
codebase and one deployment. Tabs switch via `localStorage` — no per-variant
subdomain required.

---

## What Orb Is **Not**

This fork **strips** the following from the upstream project so consumers know
exactly what to expect:

- ❌ No login / sign-up (no Clerk integration in the user-facing app)
- ❌ No payment / subscription / Pro tier (no Dodo Payments)
- ❌ No premium-gated panels (`deduction`, `regional-intelligence`,
  `latest-brief`, `trade-policy`, `chat-analyst`, `market-implications`,
  `stock-analysis`, `stock-backtest`, `daily-market-brief`,
  `wsb-ticker-scanner` — all removed from the panel registry)
- ❌ No multi-language support (English only)
- ❌ No light theme (always dark, matching the Orb visual identity)
- ❌ No "Resilience" or country-deep-dive resilience widget
- ❌ No notification routing, no API-key tab, no MCP-clients tab

If you need any of those, use the upstream
[koala73/worldmonitor](https://github.com/koala73/worldmonitor) directly.

---

## Quick Start

```bash
git clone https://github.com/parallax-ai-llc/orb.git
cd orb
npm install
npm run dev
```

Open <http://localhost:3000>. The app runs with no environment variables.

Some optional data sources need credentials (LLM keys for AI panels, etc.); see
`.env.example` for the full list.

---

## Tech Stack

| Category    | Technologies                                                            |
| ----------- | ----------------------------------------------------------------------- |
| Frontend    | Vanilla TypeScript, Vite, globe.gl + Three.js, deck.gl + MapLibre GL    |
| Build       | Vite 6, TypeScript 5.7, Biome (lint + format)                           |
| Map tiles   | Self-hosted PMTiles via R2 / OpenFreeMap fallback                       |
| Brand       | Inter (body) + JetBrains Mono (chrome), cyan accent on dark navy        |

---

## Attribution & License

Orb is licensed under the **GNU Affero General Public License v3.0**
([LICENSE](./LICENSE)), inherited from the upstream project. AGPL-3.0 is a
copyleft license; if you run a modified version of Orb on a network, you must
make your source available to its users under the same terms.

### Upstream

This work is a **modified version** of:

- **Project:** World Monitor
- **Source:** <https://github.com/koala73/worldmonitor>
- **Original author:** Elie Habib
- **Original copyright:** © 2024-2026 Elie Habib
- **Original license:** AGPL-3.0-only

The upstream project's full copyright notice is preserved in [LICENSE](./LICENSE)
alongside this fork's copyright. This combined notice satisfies AGPL §5(a-c).

### Summary of Substantial Changes

Per AGPL §5(a) ("You must cause the modified files to carry prominent notices
stating that you changed the files and the date of any change"):

- **Rebrand**: World Monitor → Orb (logo, title, meta, version, theme tokens,
  credits, social handles, domain → `orb.parallax.kr`)
- **Auth removed**: Clerk SDK calls neutralized, sign-in/sign-up UI removed,
  auth-gated tabs deleted from settings
- **Pro tier removed**: Dodo Payments orchestration neutralized, all
  premium-locked panels deleted from the panel registry and createPanel /
  lazyPanel / dynamic-import paths
- **Visual reskin**: Parallax visual system overlay (amber → cyan accent,
  Inter + JetBrains Mono, sharper borders, mono panel headers, PXM color
  tokens override the upstream `--surface`/`--border`/`--text` system)
- **Layout**: header pills / footer / classification banners / layers rail
  / map-bottom-grid / map-resize-handle removed; theater tabs replace the
  variant switcher and wire to variant navigation
- **Locale**: forced English; multi-language detector disabled
- **Theme**: forced dark; light / auto preference paths removed
- **Settings**: Notifications / API Keys / MCP Clients tabs removed
- **Map**: `resilienceScore` layer removed across all variants; per-variant
  defaults trimmed to a focused 4-layer set

This list is not exhaustive — `git log` against the initial fork commit
(`91e9b37`) for the complete diff history.

### Your Obligations Under AGPL-3.0

If you fork, modify, or run Orb on a network, you must:

1. **Preserve** this README's Attribution section and the [LICENSE](./LICENSE)
   file (including the upstream World Monitor copyright).
2. **Disclose** your modifications publicly under AGPL-3.0.
3. **Make source available** to users who interact with your instance over a
   network (including SaaS deployments).
4. **Mark your changes** prominently — add your own changes section above this
   line; do not delete prior entries.

Failure to comply may terminate your rights under §8 of the AGPL.

### Trademarks & Branding

- "Orb" and the Orb logo are used by this fork. They are **not** covered by the
  AGPL-3.0 license grant; trademark rights are reserved by Parallax. Forks of
  this codebase may freely use the source under AGPL-3.0 but must remove or
  replace the Orb brand assets.
- "World Monitor" is a trademark of its respective owner; this fork does not
  claim any rights to that mark.

---

## Contributing

Bug reports and PRs are welcome via the GitHub issue tracker. By contributing,
you agree your contributions are licensed under AGPL-3.0.

---

## Acknowledgments

Orb stands on the work of the upstream
[World Monitor](https://github.com/koala73/worldmonitor) project. Thanks to
Elie Habib and the World Monitor contributors for releasing the original
codebase under AGPL-3.0, which made this fork possible.
