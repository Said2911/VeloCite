#include <pybind11/pybind11.h>
#include <pybind11/stl.h>
#include <pybind11/numpy.h>
#include <vector>
#include <algorithm>
#include <cmath>
#include <string>
#include <map>

namespace py = pybind11;

// ── Outside any class ─────────────────────────────────────────────────────────
struct RankWeights {
    double value_score  = 0.40;
    double proximity    = 0.25;
    double recency      = 0.20;
    double completeness = 0.15;
};

static double haversine_km(double lat1, double lon1, double lat2, double lon2) {
    constexpr double R = 6371.0;
    double dlat = (lat2 - lat1) * M_PI / 180.0;
    double dlon = (lon2 - lon1) * M_PI / 180.0;
    double a = std::sin(dlat/2)*std::sin(dlat/2) +
               std::cos(lat1*M_PI/180.0)*std::cos(lat2*M_PI/180.0)*
               std::sin(dlon/2)*std::sin(dlon/2);
    return R * 2.0 * std::atan2(std::sqrt(a), std::sqrt(1.0-a));
}

class SearchEngine {
public:

    std::vector<std::pair<std::string, double>> rank_listings(
        const std::vector<std::map<std::string, py::object>>& listings,
        double center_lat,
        double center_lng,
        RankWeights weights = RankWeights{}
    ) {
        std::vector<std::pair<std::string, double>> results;
        results.reserve(listings.size());

        for (const auto& listing : listings) {
            std::string id = listing.at("id").cast<std::string>();
            double lat = listing.at("lat").cast<double>();
            double lng = listing.at("lng").cast<double>();
            double vs  = listing.at("value_score").cast<double>();

            double dist_km = haversine_km(center_lat, center_lng, lat, lng);
            double proximity_score = 10.0 / (1.0 + dist_km * 0.1);
            double final_score = weights.value_score * vs
                               + weights.proximity   * proximity_score;

            results.emplace_back(id, final_score);
        }

        std::sort(results.begin(), results.end(),
            [](const auto& a, const auto& b){ return a.second > b.second; });

        return results;
    }

    py::array_t<bool> bbox_filter(
        py::array_t<double> lats,
        py::array_t<double> lngs,
        double min_lat, double max_lat,
        double min_lng, double max_lng
    ) {
        auto lat_buf = lats.request();
        auto lng_buf = lngs.request();
        size_t n = lat_buf.size;

        auto result = py::array_t<bool>(n);
        auto res_buf = result.request();

        double* lat_ptr = static_cast<double*>(lat_buf.ptr);
        double* lng_ptr = static_cast<double*>(lng_buf.ptr);
        bool*   res_ptr = static_cast<bool*>(res_buf.ptr);

        for (size_t i = 0; i < n; i++) {
            res_ptr[i] = lat_ptr[i] >= min_lat && lat_ptr[i] <= max_lat &&
                         lng_ptr[i] >= min_lng && lng_ptr[i] <= max_lng;
        }
        return result;
    }

    py::array_t<double> normalize_prices(py::array_t<double> prices) {
        auto buf = prices.request();
        size_t n = buf.size;
        double* ptr = static_cast<double*>(buf.ptr);

        double mn = *std::min_element(ptr, ptr + n);
        double mx = *std::max_element(ptr, ptr + n);
        double range = mx - mn;

        auto result = py::array_t<double>(n);
        auto res_buf = result.request();
        double* res_ptr = static_cast<double*>(res_buf.ptr);

        for (size_t i = 0; i < n; i++) {
            res_ptr[i] = (range > 0) ? (ptr[i] - mn) / range : 0.0;
        }
        return result;
    }
};

PYBIND11_MODULE(real_estate_engine, m) {
    m.doc() = "VeloCite C++ search engine";

    py::class_<RankWeights>(m, "RankWeights")
        .def(py::init<>())
        .def_readwrite("value_score",  &RankWeights::value_score)
        .def_readwrite("proximity",    &RankWeights::proximity)
        .def_readwrite("recency",      &RankWeights::recency)
        .def_readwrite("completeness", &RankWeights::completeness);

    py::class_<SearchEngine>(m, "SearchEngine")
        .def(py::init<>())
        .def("rank_listings",    &SearchEngine::rank_listings)
        .def("bbox_filter",      &SearchEngine::bbox_filter)
        .def("normalize_prices", &SearchEngine::normalize_prices);
}