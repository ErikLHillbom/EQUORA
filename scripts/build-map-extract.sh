#!/usr/bin/env bash
# Cuts the offline map for the demo area (Yirgacheffe, Gedeo zone, Ethiopia) out of the
# public planet files and writes it to public/maps/. Run from the repo root:
#
#   PMTILES=/path/to/pmtiles bash scripts/build-map-extract.sh
#
# Needs the go-pmtiles CLI (https://github.com/protomaps/go-pmtiles/releases) and curl.
# The basemap build date is pinned so the extract is reproducible. Protomaps keeps daily
# builds for a limited time; if the date is gone, pick a newer key from
# https://build-metadata.protomaps.dev/builds.json and record it in docs/assets.md.
set -euo pipefail

PMTILES="${PMTILES:-pmtiles}"
BUILD="${PROTOMAPS_BUILD:-20261002}"
# About 20 x 20 km around the town centre (6.162 N, 38.205 E).
BBOX="38.11,6.07,38.29,6.25"
OUT="public/maps"
FONTS_BASE="https://raw.githubusercontent.com/protomaps/basemaps-assets/main/fonts"

mkdir -p "$OUT"

# Basemap: Protomaps vector tiles (OpenStreetMap, ODbL), up to zoom 15.
"$PMTILES" extract "https://build.protomaps.com/${BUILD}.pmtiles" "$OUT/yirgacheffe.pmtiles" \
  --bbox="$BBOX" --maxzoom=15

# Terrain: Mapterhorn (Copernicus GLO-30 and others), Terrarium-encoded WebP, 512 px, up to zoom 12.
"$PMTILES" extract "https://download.mapterhorn.com/planet.pmtiles" "$OUT/dem.pmtiles" \
  --bbox="$BBOX" --maxzoom=12

# Glyphs for map labels: Latin, Latin extended and Ethiopic (U+1200 to U+13FF).
for stack in "Noto Sans Regular" "Noto Sans Medium"; do
  dir="$OUT/fonts/$stack"
  mkdir -p "$dir"
  enc="${stack// /%20}"
  for range in 0-255 256-511 4608-4863 4864-5119; do
    curl -fsSL "$FONTS_BASE/$enc/$range.pbf" -o "$dir/$range.pbf"
  done
done

"$PMTILES" show "$OUT/yirgacheffe.pmtiles" | head -n 8
"$PMTILES" show "$OUT/dem.pmtiles" | head -n 8
du -ah "$OUT"
