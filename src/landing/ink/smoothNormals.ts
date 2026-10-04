// The models are low-poly and flat shaded: every face has its own vertices and its own normal,
// so light falls in facets and hatching would follow the facets. This gives every vertex the
// area-weighted average normal of all faces that share its position, so tone, and the hatching
// drawn from it, turns smoothly around the body.
//
// It works in place and keeps every other attribute (colour, skin index and weight), so the
// vertex count and the skinning do not change. Same result as mergeVertices followed by
// computeVertexNormals, but the colour seams (mane against coat) are smoothed too.
import { BufferAttribute, Vector3, type BufferGeometry } from 'three'

export function smoothNormals(geo: BufferGeometry): void {
  if (geo.userData.inkSmooth) return
  const pos = geo.getAttribute('position')
  const index = geo.getIndex()
  if (!pos) return
  const count = pos.count
  // Quantized positions come from exact integers, so equal positions give equal keys. The
  // attribute may be interleaved (meshopt), so read it through getX, never through its array.
  const keyOf = (i: number) => `${pos.getX(i)},${pos.getY(i)},${pos.getZ(i)}`
  const group = new Int32Array(count)
  const groups = new Map<string, number>()
  for (let i = 0; i < count; i++) {
    const k = keyOf(i)
    let g = groups.get(k)
    if (g === undefined) {
      g = groups.size
      groups.set(k, g)
    }
    group[i] = g
  }
  const sum = new Float32Array(groups.size * 3)
  const a = new Vector3()
  const b = new Vector3()
  const c = new Vector3()
  const triangles = index ? index.count / 3 : count / 3
  for (let t = 0; t < triangles; t++) {
    const i0 = index ? index.getX(t * 3) : t * 3
    const i1 = index ? index.getX(t * 3 + 1) : t * 3 + 1
    const i2 = index ? index.getX(t * 3 + 2) : t * 3 + 2
    a.fromBufferAttribute(pos, i0)
    b.fromBufferAttribute(pos, i1)
    c.fromBufferAttribute(pos, i2)
    // Cross product length is twice the area: larger faces weigh more.
    c.sub(b)
    a.sub(b)
    c.cross(a)
    for (const i of [i0, i1, i2]) {
      const g = group[i] * 3
      sum[g] += c.x
      sum[g + 1] += c.y
      sum[g + 2] += c.z
    }
  }
  const normals = new Float32Array(count * 3)
  for (let i = 0; i < count; i++) {
    const g = group[i] * 3
    a.set(sum[g], sum[g + 1], sum[g + 2]).normalize()
    normals[i * 3] = a.x
    normals[i * 3 + 1] = a.y
    normals[i * 3 + 2] = a.z
  }
  geo.setAttribute('normal', new BufferAttribute(normals, 3))
  geo.userData.inkSmooth = true
}
