import { canUse3D, modelSpecies, scenePose, stillUrl } from './models'

describe('models manifest', () => {
  it('draws mules with the donkey and trotting as its own pose', () => {
    expect(modelSpecies('mule')).toBe('donkey')
    expect(scenePose('trotting')).toBe('trotting')
    expect(stillUrl('mule', 'lying')).toMatch(/models3d\/stills\/donkey-lying\.webp$/)
  })
})

describe('canUse3D', () => {
  const nav = navigator as Navigator & Record<string, unknown>
  let getContext: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    getContext = vi
      .spyOn(HTMLCanvasElement.prototype, 'getContext')
      .mockReturnValue({ getExtension: () => null } as unknown as WebGL2RenderingContext)
  })
  afterEach(() => {
    getContext.mockRestore()
    delete nav.deviceMemory
    delete nav.connection
    Object.defineProperty(navigator, 'hardwareConcurrency', { value: 8, configurable: true })
  })

  it('is true on a capable phone', () => {
    Object.defineProperty(navigator, 'hardwareConcurrency', { value: 8, configurable: true })
    expect(canUse3D()).toBe(true)
  })

  it('is false without WebGL2', () => {
    getContext.mockReturnValue(null)
    expect(canUse3D()).toBe(false)
  })

  it('is false with little memory, few cores or Save-Data', () => {
    Object.defineProperty(navigator, 'deviceMemory', { value: 1, configurable: true })
    expect(canUse3D()).toBe(false)
    delete nav.deviceMemory
    Object.defineProperty(navigator, 'hardwareConcurrency', { value: 2, configurable: true })
    expect(canUse3D()).toBe(false)
    Object.defineProperty(navigator, 'hardwareConcurrency', { value: 8, configurable: true })
    Object.defineProperty(navigator, 'connection', { value: { saveData: true }, configurable: true })
    expect(canUse3D()).toBe(false)
  })
})
