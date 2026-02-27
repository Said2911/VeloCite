import type { Listing } from "@/lib/api";

const POSITION_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  underpriced: { bg: "bg-green-100", text: "text-green-700", label: "Great Deal" },
  fair_value:  { bg: "bg-blue-100",  text: "text-blue-700",  label: "Fair Value" },
  overpriced:  { bg: "bg-red-100",   text: "text-red-700",   label: "Overpriced" },
};

function ValueScoreBadge({ score }: { score: number }) {
  const color =
    score >= 7 ? "bg-green-500" :
    score >= 4 ? "bg-yellow-500" : "bg-red-500";

  return (
    <div className="flex items-center gap-2">
      <div className={`${color} text-white text-xs font-bold px-2 py-1 rounded-full`}>
        {score.toFixed(1)}
      </div>
      <div className="flex gap-0.5">
        {[...Array(10)].map((_, i) => (
          <div
            key={i}
            className={`w-2 h-2 rounded-full ${
              i < Math.round(score) ? color : "bg-gray-200"
            }`}
          />
        ))}
      </div>
    </div>
  );
}

export default function ListingCard({ listing }: { listing: Listing }) {
  const position = POSITION_STYLES[listing.market_position] ?? POSITION_STYLES.fair_value;

  const formatPrice = (price: number, currency: string) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(price);

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow">

      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-semibold text-gray-900 capitalize">
            {listing.property_type}
            {listing.bedrooms ? ` · ${listing.bedrooms} bed` : ""}
          </h3>
          <p className="text-sm text-gray-500">
            {listing.district ? `${listing.district}, ` : ""}
            {listing.city}, {listing.country_code}
          </p>
        </div>
        <span className={`text-xs font-medium px-2 py-1 rounded-full ${position.bg} ${position.text}`}>
          {position.label}
        </span>
      </div>

      {/* Price */}
      <div className="mb-4">
        <p className="text-2xl font-bold text-gray-900">
          {formatPrice(listing.price_display, listing.currency)}
        </p>
        {listing.area_sqm && (
          <p className="text-sm text-gray-500">
            {listing.area_sqm} m²
            {listing.price_per_sqm_display
              ? ` · ${formatPrice(listing.price_per_sqm_display, listing.currency)}/m²`
              : ""}
          </p>
        )}
      </div>

      {/* Value Score */}
      {listing.value_score !== null && (
        <div className="mb-4">
          <p className="text-xs text-gray-500 mb-1">Value Score</p>
          <ValueScoreBadge score={listing.value_score} />
        </div>
      )}

      {/* Details */}
      <div className="flex gap-4 text-sm text-gray-600 border-t border-gray-100 pt-3">
        {listing.floor && <span>Floor {listing.floor}</span>}
        {listing.year_built && <span>Built {listing.year_built}</span>}
        {listing.bathrooms && <span>{listing.bathrooms} bath</span>}
      </div>
    </div>
  );
}