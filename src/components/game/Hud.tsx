// Habillage HUD partagé : verre sombre violet + coins de viseur (même DA que l'accueil).
export const GLASS =
  "relative border border-white/10 bg-[#120a24]/75 shadow-[0_12px_40px_-14px_rgba(0,0,0,0.9)] backdrop-blur-xl";

export function Corners({ color = "#2de2ff", size = 10 }: { color?: string; size?: number }) {
  return (
    <>
      {["left-0 top-0 border-l-2 border-t-2", "right-0 top-0 border-r-2 border-t-2", "left-0 bottom-0 border-l-2 border-b-2", "right-0 bottom-0 border-r-2 border-b-2"].map(
        (c) => (
          <span key={c} className={`pointer-events-none absolute rounded-[3px] ${c}`} style={{ borderColor: color, width: size, height: size }} />
        ),
      )}
    </>
  );
}
