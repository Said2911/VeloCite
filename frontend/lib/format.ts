// lib/format.ts
// Display helpers shared by pages and components

export const CURRENCIES = ["AZN", "USD", "EUR", "TRY", "GBP"];

// Cities in the order they appear in filters (Baku first)
export const CITIES = ["Baku", "Sumgait", "Ganja", "Mingachevir", "Lankaran", "Shaki", "Gabala", "Guba"];

// Local names shown next to the English ones
export const CITY_LOCAL_NAMES: Record<string, string> = {
  Baku: "Bakı", Sumgait: "Sumqayıt", Ganja: "Gəncə", Mingachevir: "Mingəçevir",
  Lankaran: "Lənkəran", Shaki: "Şəki", Gabala: "Qəbələ", Guba: "Quba",
};

export const BAKU_DISTRICTS = [
  "Səbail", "Nəsimi", "Yasamal", "Nərimanov", "Nizami", "Xətai",
  "Binəqədi", "Xəzər", "Sabunçu", "Suraxanı", "Qaradağ",
];

export function formatMoney(value: number | null | undefined, currency: string, compact = false): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      currencyDisplay: "narrowSymbol", // ₼ instead of "AZN"
      notation: compact ? "compact" : "standard",
      maximumFractionDigits: compact ? 1 : value < 100 ? 2 : 0,
    }).format(value);
  } catch {
    return `${Math.round(value).toLocaleString("en-US")} ${currency}`;
  }
}

export function formatPrice(value: number, currency: string, listingType: string, compact = false): string {
  const money = formatMoney(value, currency, compact);
  return listingType === "rent" ? `${money}/mo` : money;
}

export const POSITION_STYLES: Record<string, { bg: string; color: string; label: string }> = {
  underpriced: { bg: "rgba(34,197,94,0.15)", color: "#16A34A", label: "Great deal" },
  fair_value: { bg: "rgba(59,130,246,0.15)", color: "#2563EB", label: "Fair value" },
  overpriced: { bg: "rgba(239,68,68,0.15)", color: "#DC2626", label: "Above market" },
  insufficient_data: { bg: "rgba(107,114,128,0.15)", color: "#6B7280", label: "Not enough data" },
};

export function scoreColor(score: number | null | undefined): string {
  if (score === null || score === undefined) return "#9CA3AF";
  return score >= 7 ? "#22C55E" : score >= 4 ? "#F59E0B" : "#EF4444";
}

export function propertyEmoji(type: string): string {
  return { apartment: "🏢", villa: "🏡", house: "🏠", land: "🌳", commercial: "🏬" }[type] ?? "🏗️";
}

export function placeName(city: string, district?: string | null): string {
  return district ? `${district}, ${city}` : city;
}
