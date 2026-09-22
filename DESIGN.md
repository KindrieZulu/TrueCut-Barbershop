# Design System - TrueCut Barbershop

## Product Context
- **What this is:** A multi-branch barbershop booking and operations platform - client booking, receptionist walk-in/payment handling, barber schedules, and company-admin financial/operational reporting.
- **Who it's for:** Barbershop owners, receptionists, barbers, and clients in Harare, Zimbabwe. Staff users (admin/receptionist/barber) are the primary daily users; clients book occasionally.
- **Space/industry:** Barbershop/grooming booking software, competing conceptually with Fresha, GlossGenius, and Squire - but positioned as an executive, precision-run operation rather than a generic consumer booking app.
- **Project type:** Hybrid - operational web app (dashboards, schedules, reports) plus a lighter marketing/booking front for clients.

## Aesthetic Direction
- **Direction:** Vibrant Craft - Industrial-Executive precision, warmed up. Still a serious operational tool, but livelier and more energetic than the original restrained gold-only version, pulling from the TrueCut Barber brand mark's fire motif (`frontend/src/assets/truecut-logo.webp`) and Booksy's approachable, photo-and-color-forward marketplace feel.
- **Decoration level:** Intentional, more expressive than before - every card/panel across every dashboard now shows a persistent floating shadow at rest (see Motion), not just on hover.
- **Mood:** Precision and trust, now expressed with warmth and energy rather than restraint - confident, alive, still built by people who care about the details.
- **Memorable thing:** Precision and trust, brought to life - the fire-orange accent and floating cards should feel energetic without undermining the "serious operational tool" read.
- **Reference sites (category landscape):** Fresha, GlossGenius, Squire (flat, generic) vs. Booksy (photo-forward, ProximaNova/rounded-sans warmth, teal/black accents, card-grid liveliness). TrueCut takes Booksy's energy and warmth but keeps its own dark-first, precision-tool identity rather than Booksy's light consumer-marketplace look.

## Typography
- **Display/Hero:** Satoshi (700/800/900) - warm, rounded, friendly geometric sans (replaces Cabinet Grotesk's sharper architectural feel to match the new livelier direction). Same Fontshare family suite as General Sans below, so the two pair naturally. Used for headings, hero copy, section titles. Loaded via Fontshare: `https://api.fontshare.com/v2/css?f[]=satoshi@700,800,900&display=swap`
- **Body/UI:** General Sans (400/500/600/700) - clean and highly legible for buttons, labels, forms, paragraph text. Loaded via Fontshare: `https://api.fontshare.com/v2/css?f[]=general-sans@400,500,600,700&display=swap`
- **Data/Tables:** Geist (400/500/600/700), `font-variant-numeric: tabular-nums` - for revenue figures, timestamps, and any tabular data where digits must align. Loaded via Google Fonts: `https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700&display=swap`
- **Code:** not applicable to this product's UI.
- **Scale:** Hero/H1 44px/900, H2 24px/800, body 14-16px/400-600, data values 26-30px/600-700, labels/eyebrows 11px/700 uppercase with 0.08-0.12em tracking.

## Color
- **Approach:** The accent ("gold") token now runs vivid fire-orange instead of brass-gold, pulled directly from the logo's flame ring - still reserved for primary CTAs, revenue figures, active/"with client" status, and brand mark, just warmer and more energetic. Every existing `gold-400/500/600` usage across the app updated automatically since it's a CSS-variable token, not a per-component color.
- **Dark mode (default):**
  - Background: `#0a0a0c`
  - Surface: `#141417`
  - Surface (secondary/shell): `#1c1c20`
  - Border: `#2a2a2f`
  - Text: `#f5f5f4`
  - Text muted: `#9a9a9f`
  - Gold/accent: `#f97316` (vivid orange), Gold bright (hover/emphasis): `#fb923c`, Gold deep (pressed): `#c2410c`
- **Light mode:**
  - Background: `#f6f5f2`
  - Surface: `#ffffff`
  - Surface (secondary/shell): `#eeece6`
  - Border: `#ddd9d0`
  - Text: `#17171a`
  - Text muted: `#6b6b70`
  - Gold/accent: `#9a3412` (deep burnt orange, contrast on light backgrounds), Gold bright: `#c2410c`, Gold deep: `#7c2d12`
- **Semantic:** dark values are this app's original Tailwind defaults (unchanged); light values shift deeper/more saturated, the standard move for text and badge tints sitting on a near-white surface instead of a near-black one.
  - Success (green): `#4ade80` (dark) / `#16a34a` (light)
  - Error (red): `#f87171` (dark) / `#dc2626` (light)
  - Warning (amber): `#fbbf24` (dark) / `#b45309` (light)
  - Info (blue): `#60a5fa` (dark) / `#2563eb` (light)
  - Implemented as `--tc-green-400/500/600`, `--tc-red-400/500/600`, `--tc-amber-400/500/600`, `--tc-blue-400/500/600` (only the shades this app actually uses are theme-aware; other shades and the one-off purple/emerald/yellow accents still use Tailwind's literal defaults - a known, accepted gap in the incremental rollout).
- **Theme switching:** implemented via `data-theme` attribute on `<html>` plus CSS custom properties - see `frontend/src/index.css`. A theme toggle belongs in the global Settings surface (see below) and should persist the user's choice (e.g. localStorage), defaulting to dark.

## Spacing
- **Base unit:** 8px.
- **Density:** Comfortable - data-dense admin/report screens stay grid-disciplined, but receptionist/barber-facing screens (used on the move, sometimes on tablets) keep touch-friendly spacing.
- **Scale:** xs(4) sm(8) md(16) lg(24) xl(32) 2xl(48).

## Layout
- **Approach:** Hybrid - grid-disciplined for dashboards, schedules, and reports (predictable columns, strict alignment); slightly more editorial on the client-facing welcome/marketing page (asymmetric hero, looser rhythm).
- **Max content width:** 1180px for dashboard/report views.
- **Border radius:** sm 6px (buttons, inputs, badges), md 10px (stat tiles), lg 16px (cards, panels), full 999px (pills/toggles).

## Motion
- **Approach:** CSS-3D floating cards - every panel now carries a visible shadow at rest, reading as physically lifted off the page, with a stronger lift-and-glow on interaction. More expressive than the original hover-only treatment, per explicit user request ("all boxes should be floating 3D designs with shadow... on all pages/dashboards").
- **Signature interaction:** `.card-3d` - permanent resting shadow (`0 14px 32px -10px rgba(0,0,0,0.4), 0 4px 10px -4px rgba(0,0,0,0.25)`), hover intensifies to `transform: translateY(-6px) rotateX(2deg)` with a deeper shadow and a fire-orange border glow. Applied to barber status cards, stat tiles, and any clickable or informational panel - i.e. nearly every card in the app.
- **Easing:** enter `cubic-bezier(0.16, 1, 0.3, 1)` (ease-out), short/medium durations (150-350ms).

## Settings (cross-cutting requirement)
Every role's dashboard (Company Admin, Receptionist, Barber, Client) should expose a Settings surface with, at minimum:
- Light/Dark theme toggle (persisted per-user)
- Profile/account basics (name, phone, branch where applicable)
- Notification preferences (SMS reminders, etc.)

This is a functional requirement layered on top of the visual system above, not a separate visual direction - Settings screens should use the same components, spacing, and typography as the rest of the app.

## Reference Implementation
The `.card-3d` hover pattern, color tokens, and typography roles above are demonstrated in a working HTML preview generated during the design consultation (dark + light toggle, typography specimen, color swatches, and a live-data Company Admin Dashboard mockup). Use it as the visual source of truth when implementing components.

## Decisions Log
| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-09-19 | Initial design system created (Industrial-Executive hybrid, dark+gold retained, Cabinet Grotesk/General Sans/Geist, CSS-3D card-lift motion) | Created by /design-consultation. Competitive research (Fresha/GlossGenius/Squire) showed category convergence on flat, generic, interchangeable UI - TrueCut differentiates via precision-engineered typography and depth. |
| 2026-09-19 | Added light theme as a required feature | User request during design consultation - Settings should let users switch themes, not just consume dark mode. |
| 2026-09-19 | Re-tuned semantic status colors (success/error/warning/info) for theme-awareness | User request - green/red/amber/blue text and badges were unthemed literal Tailwind colors, reading as washed-out on light backgrounds since they were only tuned for a dark background. |
| 2026-09-22 | Shifted to "Vibrant Craft": real logo integrated, accent warmed from brass-gold to fire-orange, display font Cabinet Grotesk -> Satoshi, `.card-3d` shadow now persistent (not hover-only) | User request, inspired by booksy.com's warmth/liveliness and the TrueCut Barber logo's fire motif - wanted more energy across every page/dashboard while keeping the dark-first precision-tool identity. |
