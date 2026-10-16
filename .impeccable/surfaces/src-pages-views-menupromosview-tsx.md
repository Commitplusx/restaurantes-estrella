---
version: 1
slug: "src-pages-views-menupromosview-tsx"
primary_target: "src/pages/views/MenuPromosView.tsx"
related_targets: ["src/pages/views/MenuPromosView.css", "src/components/OpcionesEditor.tsx", "src/lib/menuOptions.ts", "src/lib/promotionRules.ts", "src/hooks/usePromotionEligibility.ts", "src/pages/PublicMenuView.tsx", "src/pages/CartPage.tsx", "src/pages/CartPage.css"]
---

# Promociones del restaurante

Mode: Operate. Refinement of the existing partner portal; the home page design does not govern this editor.

The owner creates a fixed-price promotion and chooses which existing menu products belong to each option group. Retain the portal's typography, blue option editor, orange promotion cards, BottomSheet and mobile layout. Product names and IDs come from the same restaurant catalogue; selecting a product starts with zero surcharge. Keep manual extras available.

Show required groups, readable inline validation, catalogue search, checked products and explicit saving/uploading states. Preserve keyboard access and labelled controls. Customer selections must pass every required group and remain available in the current catalogue; the server validates identity, availability, schedule and prices before inserting the existing order.

MAKITAN's photographed campaign has three independent required maki choices, 18 allowed flavours in each slot, Tuesday availability and a $200 base price. Repeated flavours are allowed across slots. Extra dressings cost $5 each. Do not add other specialties, alter catalogue prices or extend restaurant opening hours.

## Delivery rules extension — 2026-10-16

This is an ordinary extension of the incumbent editor. Preserve its typography, promotion cards, blue options/subsidy sections and BottomSheet. `DESIGN.md` and `.impeccable/design.json` remain scoped to the public home and are unchanged; these controls do not establish a new visual world or a global token system.

Owners can create or edit promotions with pickup (`tienda`), delivery (`domicilio`) or both. New promotions start with both modes and all seven days. Existing promotions retain their saved rules; an absent legacy mode field opens with both. The fieldset “¿Dónde aplica?” uses labelled native checkboxes, icons, a check mark and explanatory text. Selecting neither mode shows an inline alert and disables saving. Days expose `aria-pressed`; at least one day is required to save. The optional end date includes the entire selected day in `America/Mexico_City`. Historical empty day arrays continue to mean every day in checkout; editing them requires an explicit day selection before saving.

Keep the two delivery choices side by side above 420px and stack them at 420px or below. Selected choices use the editor's warm promotion accent, a visible boundary and a check mark; focus surrounds the whole choice. Reduced motion removes their color transition. The campaign-specific MAKITAN rules above remain an existing example, not defaults for other promotions.

The owner list summarizes mode, days and end date. Public menu cards label exclusive pickup/delivery offers. The cart reads current rules for the selected restaurant and promotion IDs, shows loading/error/incompatibility states and blocks progress while unresolved. It names each affected promotion, allows retry after a read failure, and lets the customer change delivery or explicitly remove only incompatible promotions. Changing delivery alone preserves cart contents. SQL rechecks the same rules in the existing checkout transaction before creating the order.

## Evidence and finish scope

Local editor captures: `C:/Users/Kaleb/.codex/private-backups/promotion-rules-20261016/editor-desktop.png` (1440×1000) and `editor-mobile.png` (390×844). The recorded document width checks are 1440/1440 and 390/390, respectively, without horizontal document overflow. The mobile capture covers the upper editor through the price/date fields; it is not evidence of every control below the fold.

The independent finish review returned `ship` for its inspected scope. Editor interaction checks covered both modes, neither mode with saving disabled, and pickup only; no real promotion was saved in that check. The cart warning was reviewed in code and has no captured rendered state in this evidence. Five typed rule tests, ten existing web regressions, TypeScript/Vite build and ESLint of the new modules passed in the implementation work. Backend verification comprises 16 transactional checks with rollback before and after applying the migration.

As of this closure, the backend is active in Eats project `jdrrkpvodnqoljycixbg`; the web changes remain local. Usage, implementation boundaries, QA and prior document drift are recorded in `docs/PROMOTION_RULES_20261016.md`. A local build or finish verdict is not a web deployment receipt.
