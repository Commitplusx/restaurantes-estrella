---
version: 1
slug: "src-pages-views-menupromosview-tsx"
primary_target: "src/pages/views/MenuPromosView.tsx"
related_targets: ["src/components/OpcionesEditor.tsx", "src/lib/menuOptions.ts", "src/pages/PublicMenuView.tsx", "src/pages/CartPage.tsx"]
---

# Promociones del restaurante

Mode: Operate. Refinement of the existing partner portal; the home page design does not govern this editor.

The owner creates a fixed-price promotion and chooses which existing menu products belong to each option group. Retain the portal's typography, blue option editor, orange promotion cards, BottomSheet and mobile layout. Product names and IDs come from the same restaurant catalogue; selecting a product starts with zero surcharge. Keep manual extras available.

Show required groups, readable inline validation, catalogue search, checked products and explicit saving/uploading states. Preserve keyboard access and labelled controls. Customer selections must pass every required group and remain available in the current catalogue; the server validates identity, availability, schedule and prices before inserting the existing order.

MAKITAN's photographed campaign has three independent required maki choices, 18 allowed flavours in each slot, Tuesday availability and a $200 base price. Repeated flavours are allowed across slots. Extra dressings cost $5 each. Do not add other specialties, alter catalogue prices or extend restaurant opening hours.
