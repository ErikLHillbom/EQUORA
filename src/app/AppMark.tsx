// The app mark: the Equora logo, a hand-drawn horse head in a pencil circle.
// Rendered once from the team's logo file into public/logo-96.png (the source SVG is 2 MB).
export function AppMark({ size = 40 }: { size?: number }) {
  return (
    <img
      src={`${import.meta.env.BASE_URL}logo-96.png`}
      width={size}
      height={size}
      alt=""
      aria-hidden="true"
      className="app-mark"
      decoding="async"
    />
  )
}
