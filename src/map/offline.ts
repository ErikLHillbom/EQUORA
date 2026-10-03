// Offline map sources. Each .pmtiles file is fetched once, whole, and served to MapLibre from
// memory through the pmtiles:// protocol. No range requests, so the service worker can
// precache the files and the map works with no network at all.
import { addProtocol, setWorkerUrl } from 'maplibre-gl'
// The MapLibre worker imports a shared chunk, so let Vite bundle it into one file. Without
// this the worker URL breaks under Vite (pre-bundled in dev, hashed in the build).
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url'
import { FileSource, PMTiles, Protocol } from 'pmtiles'
import { MAP_FILES } from './style'

/** String key for the empty state shown when the files are missing (src/map/strings.ts). */
export const MAP_MISSING_KEY = 'map.offline.missing'

export class MapTilesMissingError extends Error {
  readonly file: string
  constructor(file: string, cause?: unknown) {
    super(`Map file not available: ${file}`, { cause })
    this.name = 'MapTilesMissingError'
    this.file = file
  }
}

let protocol: Protocol | null = null
let ready: Promise<void> | null = null

async function loadFile(baseUrl: string, name: string): Promise<File> {
  let res: Response
  try {
    res = await fetch(`${baseUrl}maps/${name}`)
  } catch (err) {
    throw new MapTilesMissingError(name, err)
  }
  // A missing file can come back as the SPA's index.html with status 200, so check the type too.
  const type = res.headers.get('content-type') ?? ''
  if (!res.ok || type.includes('text/html')) throw new MapTilesMissingError(name)
  const blob = await res.blob()
  if (blob.size < 127) throw new MapTilesMissingError(name)
  return new File([blob], name)
}

/**
 * Registers the pmtiles:// protocol and loads the basemap and terrain files into memory.
 * Safe to call many times; the work runs once. Rejects with MapTilesMissingError when a file
 * cannot be read, so the map screen can show the `map.offline.missing` note. A later call
 * tries again.
 */
export function ensureMapSources(baseUrl: string = import.meta.env.BASE_URL ?? '/'): Promise<void> {
  if (ready) return ready
  ready = (async () => {
    const files = await Promise.all(Object.values(MAP_FILES).map((name) => loadFile(baseUrl, name)))
    if (!protocol) {
      setWorkerUrl(workerUrl)
      protocol = new Protocol()
      addProtocol('pmtiles', protocol.tile)
    }
    for (const file of files) {
      const archive = new PMTiles(new FileSource(file))
      // Read the header now, so a corrupt file fails here and not inside the map.
      try {
        await archive.getHeader()
      } catch (err) {
        throw new MapTilesMissingError(file.name, err)
      }
      protocol.add(archive)
    }
  })()
  ready.catch(() => {
    ready = null
  })
  return ready
}
