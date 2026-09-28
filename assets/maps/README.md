# Bundled map assets

`runtime.json` packages the map renderer, stylesheet, world geography, and unambiguous city-name coordinates so the map does not require a CDN or tile server to display.

Sources downloaded 2026-09-28:

- Leaflet 1.9.4: https://unpkg.com/leaflet@1.9.4/dist/leaflet.js and https://unpkg.com/leaflet@1.9.4/dist/leaflet.css (BSD-2-Clause, see LEAFLET-LICENSE.txt).
- Natural Earth countries: https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_50m_admin_0_countries.geojson
- Natural Earth populated places: https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_populated_places.geojson
- Natural Earth data is public domain: https://www.naturalearthdata.com/about/terms-of-use/

To rebuild, download those files here as `leaflet.js`, `leaflet.css`, `world-source.json`, and `places-source.json`, run `node scripts/build-map-assets.cjs`, then remove the four downloaded inputs. Only geometry, region names and city coordinates are retained. Raster street tiles remain optional online detail. City names absent or ambiguous in the bundled gazetteer use Photon.

Run `node scripts/build-city-names.cjs` after rebuilding `runtime.json` to refresh the compact Chinese-name autocomplete index used when adding an event. This index contains city names and labels only, without map geometry or the Leaflet renderer.

`china-cities.json`: cn-atlas 0.1.2, https://unpkg.com/cn-atlas@0.1.2/prefectures.json (ISC, author Amll), derived from https://github.com/ruiduobao/shengshixian.com (MIT; see CHINA-SOURCE-LICENSE.txt). 2023 administrative boundaries, 372 features including prefectures, directly administered cities and special regions; the source represents Taiwan as one region. Retained properties are Chinese name, English name and administrative ID; coordinates rounded to four decimals. Data is for personal travel visualization, not surveying or navigation.

Recorded overseas city boundaries are requested sequentially from https://overpass-api.de/api/interpreter using the city's names and approximate center, then cached in localStorage. Source: OpenStreetMap contributors, ODbL https://www.openstreetmap.org/copyright. Only complete administrative multipolygons containing the matched city center are accepted. Missing boundaries remain explicitly unavailable; cached boundaries require no network. No Nominatim dependency. The app retains attribution when raster tiles are removed.

`taiwan-cities.json` replaces the single Taiwan geometry from cn-atlas with 22 county/city regions from geoBoundaries gbOpen TWN ADM1 (2017; OpenStreetMap/Wambacher, ODbL 1.0). Source: https://media.githubusercontent.com/media/wmgeolab/geoBoundaries/9469f09/releaseData/gbOpen/TWN/ADM1/geoBoundaries-TWN-ADM1_simplified.geojson ; metadata: https://www.geoboundaries.org/api/current/gbOpen/TWN/ADM1/ . Coordinates rounded to four decimals and Chinese labels added. This derived dataset is shared under ODbL 1.0: https://opendatacommons.org/licenses/odbl/1-0/ . Attribution: Runfola et al. (2020), geoBoundaries: A global database of political administrative boundaries, PLOS ONE 15(4): e0231866, https://doi.org/10.1371/journal.pone.0231866 .
