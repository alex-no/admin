// SVG inner HTML for each amenity slug.
// Used inside <svg viewBox="0 0 64 64" ...> via v-html.
export const AMENITY_ICONS = {
  wifi: `
    <circle cx="32" cy="52" r="4" fill="currentColor" stroke="none"/>
    <path d="M21 43 Q32 33 43 43" stroke-width="3.5"/>
    <path d="M12 34 Q32 19 52 34" stroke-width="3.5"/>
    <path d="M3 25 Q32 5 61 25" stroke-width="3.5"/>`,

  coffee: `
    <path d="M20 13 Q23 8 20 3" stroke-width="2.5"/>
    <path d="M32 13 Q35 8 32 3" stroke-width="2.5"/>
    <path d="M44 13 Q47 8 44 3" stroke-width="2.5"/>
    <path d="M10 18 L14 52 H50 L54 18 Z" stroke-width="2.5"/>
    <path d="M54 26 C62 26 62 42 54 42" stroke-width="2.5"/>
    <line x1="6" y1="56" x2="58" y2="56" stroke-width="2.5"/>`,

  waiting_room: `
    <rect x="14" y="14" width="36" height="24" rx="5" stroke-width="2.5"/>
    <rect x="10" y="34" width="44" height="14" rx="4" stroke-width="2.5"/>
    <rect x="6"  y="28" width="8"  height="20" rx="4" stroke-width="2.5"/>
    <rect x="50" y="28" width="8"  height="20" rx="4" stroke-width="2.5"/>
    <line x1="16" y1="48" x2="14" y2="60" stroke-width="2.5"/>
    <line x1="48" y1="48" x2="50" y2="60" stroke-width="2.5"/>`,

  tv: `
    <rect x="4"  y="6"  width="56" height="40" rx="4" stroke-width="2.5"/>
    <rect x="9"  y="11" width="46" height="30" rx="2" stroke-width="1.5"/>
    <line x1="32" y1="46" x2="32" y2="56" stroke-width="3"/>
    <line x1="20" y1="58" x2="44" y2="58" stroke-width="3"/>
    <circle cx="56" cy="10" r="2.5" fill="currentColor" stroke="none"/>`,

  ac: `
    <rect x="4" y="12" width="56" height="26" rx="5" stroke-width="2.5"/>
    <line x1="12" y1="23" x2="52" y2="23" stroke-width="2"/>
    <line x1="12" y1="29" x2="52" y2="29" stroke-width="2"/>
    <line x1="12" y1="35" x2="52" y2="35" stroke-width="2"/>
    <circle cx="52" cy="17" r="3" fill="currentColor" stroke="none"/>
    <path d="M16 42 Q12 50 18 54" stroke-width="2"/>
    <path d="M28 42 Q24 52 30 56" stroke-width="2"/>
    <path d="M40 42 Q44 52 38 56" stroke-width="2"/>
    <path d="M52 42 Q56 50 50 54" stroke-width="2"/>`,

  parking: `
    <rect x="6" y="6" width="52" height="52" rx="8" stroke-width="2.5"/>
    <line x1="22" y1="16" x2="22" y2="48" stroke-width="4"/>
    <path d="M22 16 H36 C44 16 44 32 36 32 H22" stroke-width="3.5"/>`,

  generator: `
    <path d="M48 12 A26 26 0 1 1 16 12" stroke-width="3"/>
    <path d="M36 4 L24 34 H34 L28 60 L52 28 H40 Z" stroke-width="2.5" fill="currentColor"/>`,

  card_payment: `
    <rect x="4" y="12" width="56" height="40" rx="5" stroke-width="2.5"/>
    <rect x="4" y="20" width="56" height="10" fill="currentColor" stroke="none" opacity="0.7"/>
    <rect x="10" y="36" width="14" height="10" rx="2" stroke-width="2"/>
    <line x1="17" y1="36" x2="17" y2="46" stroke-width="1.5"/>
    <line x1="10" y1="41" x2="24" y2="41" stroke-width="1.5"/>
    <circle cx="36" cy="42" r="2.5" fill="currentColor" stroke="none"/>
    <circle cx="44" cy="42" r="2.5" fill="currentColor" stroke="none"/>
    <circle cx="52" cy="42" r="2.5" fill="currentColor" stroke="none"/>`,

  vat_docs: `
    <path d="M8 4 H42 L56 18 V60 H8 Z" stroke-width="2.5"/>
    <path d="M42 4 V18 H56" stroke-width="2"/>
    <line x1="16" y1="28" x2="48" y2="28" stroke-width="2.5"/>
    <line x1="16" y1="36" x2="48" y2="36" stroke-width="2.5"/>
    <line x1="16" y1="44" x2="36" y2="44" stroke-width="2.5"/>
    <circle cx="44" cy="50" r="7" stroke-width="2"/>
    <line x1="40" y1="50" x2="48" y2="50" stroke-width="2"/>
    <line x1="40" y1="47" x2="48" y2="47" stroke-width="2"/>
    <line x1="44" y1="44" x2="44" y2="57" stroke-width="2"/>`,

  toilet: `
    <rect x="18" y="6" width="28" height="18" rx="3" stroke-width="2.5"/>
    <circle cx="32" cy="10" r="4" stroke-width="2"/>
    <path d="M10 24 H54 Q54 52 32 54 Q10 52 10 24 Z" stroke-width="2.5"/>
    <path d="M10 24 Q10 18 32 18 Q54 18 54 24" stroke-width="2"/>
    <line x1="22" y1="54" x2="42" y2="54" stroke-width="3"/>
    <line x1="18" y1="58" x2="46" y2="58" stroke-width="3"/>`,

  car_wash: `
    <rect x="4"  y="32" width="56" height="18" rx="4" stroke-width="2.5"/>
    <path d="M10 32 L18 20 H46 L54 32" stroke-width="2.5"/>
    <path d="M20 32 L24 22 H40 L44 32" stroke-width="1.5"/>
    <circle cx="16" cy="50" r="7" stroke-width="2.5"/>
    <circle cx="48" cy="50" r="7" stroke-width="2.5"/>
    <path d="M20 10 Q22 5 24 10 Q22 15 20 10 Z" fill="currentColor" stroke="none"/>
    <path d="M30 7  Q32 2 34 7  Q32 12 30 7  Z" fill="currentColor" stroke="none"/>
    <path d="M40 10 Q42 5 44 10 Q42 15 40 10 Z" fill="currentColor" stroke="none"/>`,

  loaner_car: `
    <rect x="2"  y="34" width="40" height="16" rx="3" stroke-width="2.5"/>
    <path d="M6 34 L12 24 H30 L36 34" stroke-width="2.5"/>
    <path d="M13 34 L16 26 H28 L31 34" stroke-width="1.5"/>
    <circle cx="10" cy="50" r="5" stroke-width="2.5"/>
    <circle cx="32" cy="50" r="5" stroke-width="2.5"/>
    <circle cx="52" cy="16" r="9" stroke-width="2.5"/>
    <circle cx="52" cy="16" r="3.5" fill="currentColor" stroke="none"/>
    <line x1="59" y1="23" x2="59" y2="54" stroke-width="2.5"/>
    <line x1="59" y1="40" x2="64" y2="40" stroke-width="2.5"/>
    <line x1="59" y1="48" x2="64" y2="48" stroke-width="2.5"/>`,

  pickup: `
    <rect x="2"  y="36" width="38" height="16" rx="3" stroke-width="2.5"/>
    <path d="M6 36 L12 26 H28 L34 36" stroke-width="2.5"/>
    <circle cx="10" cy="52" r="5" stroke-width="2.5"/>
    <circle cx="30" cy="52" r="5" stroke-width="2.5"/>
    <path d="M50 2 C58 2 62 8 62 16 C62 26 50 42 50 42 C50 42 38 26 38 16 C38 8 42 2 50 2 Z" stroke-width="2.5"/>
    <circle cx="50" cy="16" r="5" fill="currentColor" stroke="none"/>`,

  coffee_machine: `
    <rect x="10" y="2"  width="44" height="60" rx="5" stroke-width="2.5"/>
    <rect x="16" y="8"  width="32" height="16" rx="3" stroke-width="2"/>
    <line x1="20" y1="14" x2="44" y2="14" stroke-width="1.5"/>
    <line x1="20" y1="19" x2="36" y2="19" stroke-width="1.5"/>
    <circle cx="22" cy="34" r="3" fill="currentColor" stroke="none"/>
    <circle cx="32" cy="34" r="3" fill="currentColor" stroke="none"/>
    <circle cx="42" cy="34" r="3" fill="currentColor" stroke="none"/>
    <circle cx="22" cy="43" r="3" fill="currentColor" stroke="none"/>
    <circle cx="32" cy="43" r="3" fill="currentColor" stroke="none"/>
    <circle cx="42" cy="43" r="3" fill="currentColor" stroke="none"/>
    <rect x="16" y="50" width="32" height="10" rx="2" stroke-width="2"/>
    <path d="M26 54 L27 58 H37 L38 54 Z" stroke-width="1.5"/>`,

  parts_in_stock: `
    <path d="M8 36 L8 58 H56 L56 36" stroke-width="2.5"/>
    <path d="M8 36 L20 26 L32 32 L44 26 L56 36" stroke-width="2.5"/>
    <line x1="32" y1="32" x2="32" y2="58" stroke-width="1.5" stroke-dasharray="4 3"/>
    <path d="M22 52 L34 40" stroke-width="3"/>
    <circle cx="20" cy="54" r="5" stroke-width="2.5"/>
    <circle cx="36" cy="38" r="5" stroke-width="2.5"/>`,

  parts_to_order: `
    <rect x="4"  y="28" width="38" height="30" rx="3" stroke-width="2.5"/>
    <line x1="4"  y1="36" x2="42" y2="36" stroke-width="2"/>
    <path d="M4 28 L10 18 H36 L42 28" stroke-width="2"/>
    <line x1="23" y1="28" x2="23" y2="18" stroke-width="2" stroke-dasharray="3 2"/>
    <circle cx="50" cy="18" r="11" stroke-width="2.5"/>
    <line x1="58" y1="26" x2="63" y2="34" stroke-width="3"/>
    <line x1="50" y1="12" x2="50" y2="24" stroke-width="2.5"/>
    <line x1="44" y1="18" x2="56" y2="18" stroke-width="2.5"/>`,

  warranty: `
    <path d="M32 2 L58 12 V36 C58 50 44 60 32 62 C20 60 6 50 6 36 V12 Z" stroke-width="2.5"/>
    <path d="M18 34 L27 44 L46 24" stroke-width="4"/>`,

  children_room: `
    <circle cx="20" cy="20" r="14" stroke-width="2.5"/>
    <circle cx="44" cy="16" r="11" stroke-width="2.5"/>
    <circle cx="20" cy="34" r="2" fill="currentColor" stroke="none"/>
    <circle cx="44" cy="27" r="2" fill="currentColor" stroke="none"/>
    <path d="M20 36 Q18 44 22 56" stroke-width="2"/>
    <path d="M44 29 Q46 40 42 56" stroke-width="2"/>
    <path d="M22 48 Q32 44 42 48" stroke-width="1.5"/>
    <circle cx="32" cy="58" r="3" stroke-width="2"/>`,

  tow_truck: `
    <rect x="2"  y="28" width="22" height="22" rx="3" stroke-width="2.5"/>
    <rect x="5"  y="32" width="16" height="10" rx="2" stroke-width="2"/>
    <rect x="24" y="32" width="38" height="18" rx="2" stroke-width="2.5"/>
    <circle cx="11" cy="50" r="7" stroke-width="2.5"/>
    <circle cx="36" cy="50" r="7" stroke-width="2.5"/>
    <circle cx="54" cy="50" r="7" stroke-width="2.5"/>
    <line x1="50" y1="32" x2="50" y2="10" stroke-width="3"/>
    <line x1="50" y1="10" x2="62" y2="10" stroke-width="3"/>
    <path d="M62 10 Q62 22 54 22 Q46 22 46 28" stroke-width="2.5"/>
    <path d="M46 28 Q44 32 48 32" stroke-width="2.5"/>`,
}
