# Design System - TrueCut Barbershop

## Product Context
- **What this is:** A multi-branch barbershop booking and operations platform - client booking, receptionist walk-in/payment handling, barber schedules, and company-admin financial/operational reporting.
- **Who it's for:** Barbershop owners, receptionists, barbers, and clients in Harare, Zimbabwe. Staff users (admin/receptionist/barber) are the primary daily users; clients book occasionally.
- **Space/industry:** Barbershop/grooming booking software, competing conceptually with Fresha, GlossGenius, and Squire - but positioned as an executive, precision-run operation rather than a generic consumer booking app.
- **Project type:** Hybrid - operational web app (dashboards, schedules, reports) plus a lighter marketing/booking front for clients.

## Aesthetic Direction
- **Direction:** Industrial-Executive hybrid.
- **Decoration level:** Intentional - subtle CSS-3D depth on interactive surfaces, no decorative texture or pattern for its own sake.
- **Mood:** Precision-engineered and trustworthy. The product should feel like a serious operational tool run by people who take the craft seriously, not a generic SaaS booking template.
- **Memorable thing:** Precision and trust - every design decision should reinforce that this system is exact, dependable, and built by people who care about the details.
- **Reference sites (category landscape):** Fresha, GlossGenius, Squire - all converge on flat, friendly, interchangeable visual language. TrueCut deliberately departs with dark-first UI, sharper typography, and subtle depth.

## Typography
- **Display/Hero:** Cabinet Grotesk (700/800/900) - sharp, architectural, geometric. Used for headings, hero copy, section titles. Loaded via Fontshare: `https://api.fontshare.com/v2/css?f[]=cabinet-grotesk@700,800,900&display=swap`
- **Body/UI:** General Sans (400/500/600/700) - clean and highly legible for buttons, labels, forms, paragraph text. Loaded via Fontshare: `https://api.fontshare.com/v2/css?f[]=general-sans@400,500,600,700&display=swap`
- **Data/Tables:** Geist (400/500/600/700), `font-variant-numeric: tabular-nums` - for revenue figures, timestamps, and any tabular data where digits must align. Loaded via Google Fonts: `https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700&display=swap`
- **Code:** not applicable to this product's UI.
- **Scale:** Hero/H1 44px/900, H2 24px/800, body 14-16px/400-600, data values 26-30px/600-700, labels/eyebrows 11px/700 uppercase with 0.08-0.12em tracking.

## Color
- **Approach:** Restrained. Gold is rare and meaningful - reserved for primary CTAs, revenue figures, active/"with client" status, and brand mark. Never used as decoration.
- **Dark mode (default):**
  - Background: `#0a0a0c`
  - Surface: `#141417`
  - Surface (secondary/shell): `#1c1c20`
  - Border: `#2a2a2f`
  - Text: `#f5f5f4`
  - Text muted: `#9a9a9f`
  - Gold: `#d4af37`, Gold bright (hover/emphasis): `#e8c65a`, Gold dim (tinted backgrounds): `rgba(212,175,55,0.14)`
- **Light mode:**
  - Background: `#f6f5f2`
  - Surface: `#ffffff`
  - Surface (secondary/shell): `#eeece6`
  - Border: `#ddd9d0`
  - Text: `#17171a`
  - Text muted: `#6b6b70`
  - Gold: `#a8791f` (deepened for contrast on light backgrounds), Gold bright: `#8f6414`, Gold dim: `rgba(168,121,31,0.10)`
- **Semantic:** success `#4ade80` (dark) / `#16a34a` (light), error `#f87171` (dark) / `#dc2626` (light).
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
- **Approach:** CSS-3D micro-interactions - intentional, not expressive. Motion should always aid comprehension or add a sense of precision, never choreography for its own sake.
- **Signature interaction:** card hover-lift - `transform: translateY(-4px) rotateX(2deg)` with a matching elevated shadow and a gold-tinted border glow (see `.card-3d` pattern below). Used on barber status cards, stat tiles, and any clickable panel.
- **Easing:** enter `cubic-bezier(0.16, 1, 0.3, 1)` (ease-out), short/medium durations (150-350ms). No expressive/scroll-driven choreography - this is a professional operational tool, not a marketing showcase.

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
