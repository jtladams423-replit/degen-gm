import React from "react";

export function VisuallyHidden({ children }: { children: React.ReactNode }) {
  return (
    <span
      style={{
        position: "absolute",
        width: "1px",
        height: "1px",
        padding: 0,
        margin: "-1px",
        overflow: "hidden",
        clip: "rect(0,0,0,0)",
        whiteSpace: "nowrap",
        borderWidth: 0,
      }}
    >
      {children}
    </span>
  );
}

export function LiveRegion({
  children,
  role = "status",
  "aria-live": ariaLive = "polite",
}: {
  children: React.ReactNode;
  role?: "status" | "alert" | "log";
  "aria-live"?: "polite" | "assertive" | "off";
}) {
  return (
    <div role={role} aria-live={ariaLive} aria-atomic="true">
      {children}
    </div>
  );
}

export function FocusTrap({ children, active = true }: { children: React.ReactNode; active?: boolean }) {
  const containerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!active || !containerRef.current) return;
    const focusableSelector = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
    const focusable = containerRef.current.querySelectorAll(focusableSelector);
    const first = focusable[0] as HTMLElement;
    const last = focusable[focusable.length - 1] as HTMLElement;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key !== "Tab") return;
      if (e.shiftKey) {
        if (document.activeElement === first) { e.preventDefault(); last?.focus(); }
      } else {
        if (document.activeElement === last) { e.preventDefault(); first?.focus(); }
      }
    }

    containerRef.current.addEventListener("keydown", handleKeyDown);
    return () => containerRef.current?.removeEventListener("keydown", handleKeyDown);
  }, [active]);

  return <div ref={containerRef}>{children}</div>;
}
