---
version: 1
slug: "src-components-publicinfolayout-tsx"
primary_target: "src/components/PublicInfoLayout.tsx"
related_targets: ["src/components/publicInfo.css","src/pages/BeneficiosPage.tsx","src/pages/PrivacyPage.tsx","src/pages/TermsPage.tsx"]
---

# Información pública

Read. Extensión autorizada del blanco, Outfit, tinta y naranja Estrella a Beneficios, Términos y Privacidad. Lectura y orientación antes que titulares gigantes o tarjetas repetidas. Documentos con índice y ancho de texto acotado; Beneficios con filas separadas y salida al catálogo. Mantener textos y listas legales existentes; no inventar condiciones ni certificar claims comerciales.

PC: máximo 1120px, índice lateral 240px y gutter 32px. Móvil menor de 768px: columna única, gutter 20px, índice arriba y enlaces de 44px. Tipografía y composición deben admitir 320px sin overflow horizontal.

Continuidad: una entrada de documento con máscara/lateral en 420ms; salida en 180ms y regreso con dirección inversa. Temporizador único acotado de 190ms, limpieza al desmontar, enlaces nativos con modificadores y contenido visible por defecto. Reducir movimiento omite el desplazamiento y espera. Ver restaurantes utiliza el catálogo existente de la home, sin nueva lógica de pedido ni datos persistidos.

Fuentes y evidencia: `docs/PUBLIC_INFO_DESIGN_20261012.md`, `docs/GUIA_WEB.md`; arquitectura de negocio en el archivo de la raíz de Loyalty. Esta superficie no sustituye DESIGN.md ni los contratos de menú, carrito o portal.
