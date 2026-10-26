# Portal de restaurantes de Estrella Eats

Mode: Operate. User explicitly requested a full portal redesign using the existing Estrella Eats website identity, and asked to continue code work while browser control is disabled. Preserve brand truth: Outfit, white #ffffff, ink #1d1d1f, gray #f5f5f7, orange #ea4e25, dark interaction orange #bd3818 for contrast. Code-led implementation on the existing React/RPC flow; no new dispatch engine or authentication path.

The first viewport is an operational workspace: restaurant identity in a narrow desktop rail, visible task navigation, current branch in the header and the actual selected view. Active navigation is ink/white, with orange reserved for brand and operational actions. No marketing hero, invented metrics, decorative graphics or heavy parallax. Existing state transitions stay short and the kitchen monitor remains mounted.

Primary account always has Sucursales in desktop and mobile navigation. Branch accounts do not get family-management controls. Their own login and server ownership restrictions remain unchanged. The branch selector identifies where menu/profile/shipping changes apply; kitchen explicitly reads all owned branches. Mobile has four relevant destinations plus Más, which opens a native dialog with every permitted section, Escape handling, focus containment/restoration and logout. Do not squeeze seven to nine tiny buttons into a phone footer.

Apply the same controls, compact neutral surfaces and brand colors to dashboard, dishes, combos, promotions, coupons and profile. The dashboard keeps actual values and shows its five statistics as one compact data strip; preserve loading/error/empty states, QR, restaurant pause and all business handlers. Do not create a customer notice or real service for visual QA.

Verification: TypeScript/Vite build, 46 typed regression tests and clean new-module lint; existing-view comparison finds no new lint issues. Detector on the shared shell returns no findings. Browser review at mobile/desktop is explicitly pending; user selected continue with code for now. Development-only `/portal-diseno` uses the production shell and pure branch rows with synthetic records, without real writes. No screenshot of this new design has been observed yet; previous pickup screenshots prove the earlier PIN UI only.

Publication update: user explicitly requested upload on 2026-10-26. Publish the reviewed code to main and verify Vercel/public modules; visual mobile/desktop QA remains unclaimed. No backend or APK changes.
