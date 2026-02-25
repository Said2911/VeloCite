#include <pybind11/pybind11.h>
#include <pybind11/stl.h>
#include <pybind11/numpy.h>
#include <vector>
#include <algorithm>
#include <cmath>
#include <string>

namespace py = pybind11;

// ─── Haversine Distance ───────────────────────────────────────────────────────
// Calculates real-world distance between two GPS coordinates (in km)
double haversine_km(double lat1, double lon1, double lat2, double lon2) {
    constexpr double R = 6371.0;
    double dlat = (lat2 - lat1) * M_PI / 180.0;
    double dlon = (lon2 - lon1) * M_PI / 180.0;
    double a = std::sin(dlat/2) * std::sin(dlat/2) +
               std::cos(lat1 * M_PI/180.0) * std::cos(lat2 * M_PI/180.0) *
               std::sin(dlon/2) * std::sin(dlon/2);
    return R * 2 * std::atan2(std::sqrt(a), std::sqrt(1-a));
}

// ─── Search Engine Class ──────────────────────────────────────────────────────
class SearchEngine {
public:

    // Ranking weights (tunable from Python)
    struct RankWeights {
        double value_score = 0.40;
        double proximity   = 0.25;
        double recency     = 0.20;
        double completeness = 0.15;
    };

    // Rank listings by composite score
    std::vector<std::pair<std::string, double>> rank_listings(
        const std::vector<py::dict>& listings,
        double center_lat,
        double center_lng,
        const RankWeights& weights = RankWeights{}
    ) {
        std::vector<std::pair<std::string, double>> results;
        results.reserve(listings.size());

        for (const auto& item : listings) {
            std::string id     = item["id"].cast<std::string>();
            double lat         = item["lat"].cast<double>();
            double lng         = item["lng"].cast<double>();
            double value_score = item["value_score"].cast<double>();

            // Closer = higher proximity score
            double dist_km = haversine_km(center_lat, center_lng, lat, lng);
            double proximity_score = 10.0 / (1.0 + dist_km * 0.1);

            double final_score =
                weights.value_score * value_score +
                weights.proximity   * proximity_score;

            results.emplace_back(id, final_score);
        }

        // Sort best first
        std::sort(results.begin(), results.end(),
            [](const auto& a, const auto& b) {
                return a.second > b.second;
            });

        return results;
    }

    // Fast bounding box filter before hitting the database
    std::vector<bool> bbox_filter(
        py::array_t<double> lats,
        py::array_t<double> lngs,
        double min_lat, double max_lat,
        double min_lng, double max_lng
    ) {
        auto lat_buf = lats.request();
        auto lng_buf = lngs.request();
        size_t n = lat_buf.size;

        const double* lat_ptr = static_cast<double*>(lat_buf.ptr);
        const double* lng_ptr = static_cast<double*>(lng_buf.ptr);

        std::vector<bool> mask(n);
        for (size_t i = 0; i < n; ++i) {
            mask[i] = lat_ptr[i] >= min_lat && lat_ptr[i] <= max_lat &&
                      lng_ptr[i] >= min_lng && lng_ptr[i] <= max_lng;
        }
        return mask;
    }

    // Normalize prices to 0-1 range for scoring
    py::array_t<double> normalize_prices(py::array_t<double> prices) {
        auto buf = prices.request();
        auto* ptr = static_cast<double*>(buf.ptr);
        size_t n = buf.size;

        auto result = py::array_t<double>(n);
        auto* res_ptr = static_cast<double*>(result.request().ptr);

        double min_p = *std::min_element(ptr, ptr + n);
        double max_p = *std::max_element(ptr, ptr + n);
        double range = max_p - min_p;

        for (size_t i = 0; i < n; ++i) {
            res_ptr[i] = range > 0 ? (ptr[i] - min_p) / range : 0.5;
        }
        return result;
    }
};

// ─── Python Bindings ──────────────────────────────────────────────────────────
PYBIND11_MODULE(real_estate_engine, m) {
    m.doc() = "VeloCite high-performance search engine core";

    py::class_<SearchEngine::RankWeights>(m, "RankWeights")
        .def(py::init<>())
        .def_readwrite("value_score",   &SearchEngine::RankWeights::value_score)
        .def_readwrite("proximity",     &SearchEngine::RankWeights::proximity)
        .def_readwrite("recency",       &SearchEngine::RankWeights::recency)
        .def_readwrite("completeness",  &SearchEngine::RankWeights::completeness);

    py::class_<SearchEngine>(m, "SearchEngine")
        .def(py::init<>())
        .def("rank_listings",    &SearchEngine::rank_listings,
             py::arg("listings"),
             py::arg("center_lat"),
             py::arg("center_lng"),
             py::arg("weights") = SearchEngine::RankWeights{})
        .def("bbox_filter",      &SearchEngine::bbox_filter)
        .def("normalize_prices", &SearchEngine::normalize_prices);
}