// Swipe a card left (touch) to reveal a trash action — the phone-native way
// to delete from a kanban column or card list. Vertical scrolling is left
// alone: the gesture only engages once a touch moves decisively horizontally.
import { useRef, useState, type ReactNode, type TouchEvent } from "react";
import { Trash2 } from "lucide-react";

/** How far the content slides to fully reveal the trash button (px). */
const OPEN_PX = 76;
/** Horizontal movement before the gesture engages (px). */
const ENGAGE_PX = 12;

export function SwipeToDelete({
  onDelete,
  label = "Delete",
  children,
}: {
  onDelete: () => void;
  label?: string;
  children: ReactNode;
}) {
  const [dx, setDx] = useState(0);
  const [dragging, setDragging] = useState(false);
  const start = useRef<{ x: number; y: number; base: number } | null>(null);
  const axis = useRef<"h" | "v" | null>(null);
  const justDragged = useRef(false);

  const onTouchStart = (e: TouchEvent) => {
    const t = e.touches[0];
    start.current = { x: t.clientX, y: t.clientY, base: dx };
    axis.current = null;
  };

  const onTouchMove = (e: TouchEvent) => {
    if (!start.current) return;
    const t = e.touches[0];
    const mx = t.clientX - start.current.x;
    const my = t.clientY - start.current.y;
    if (!axis.current) {
      if (Math.abs(mx) < ENGAGE_PX && Math.abs(my) < ENGAGE_PX) return;
      axis.current = Math.abs(mx) > Math.abs(my) ? "h" : "v";
    }
    if (axis.current === "v") return; // the user is scrolling
    setDragging(true);
    justDragged.current = true;
    setDx(Math.max(-OPEN_PX - 16, Math.min(0, start.current.base + mx)));
  };

  const onTouchEnd = () => {
    start.current = null;
    setDragging(false);
    setDx((d) => (d < -OPEN_PX / 2 ? -OPEN_PX : 0));
    // Let the click that ends this touch be swallowed, then re-enable taps.
    setTimeout(() => (justDragged.current = false), 80);
  };

  const open = dx <= -OPEN_PX / 2;

  return (
    <div className="relative overflow-hidden" style={{ touchAction: "pan-y" }}>
      {/* Trash underlay — only interactive once revealed */}
      <div
        className={`absolute inset-y-0 right-0 flex w-[${OPEN_PX}px] items-stretch ${open ? "" : "pointer-events-none"}`}
        style={{ width: OPEN_PX }}
        aria-hidden={!open}
      >
        <button
          className="flex flex-1 flex-col items-center justify-center gap-1 bg-destructive text-destructive-foreground"
          aria-label={label}
          onClick={() => {
            setDx(0);
            onDelete();
          }}
        >
          <Trash2 className="h-4 w-4" />
          <span className="text-[10px] font-medium">{label}</span>
        </button>
      </div>
      <div
        style={{
          transform: `translateX(${dx}px)`,
          transition: dragging ? "none" : "transform 160ms ease-out",
        }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onTouchCancel={onTouchEnd}
        onClickCapture={(e) => {
          // A tap while open (or the tail of a swipe) closes instead of
          // activating links/buttons underneath.
          if (open || justDragged.current) {
            e.preventDefault();
            e.stopPropagation();
            setDx(0);
          }
        }}
      >
        {children}
      </div>
    </div>
  );
}
