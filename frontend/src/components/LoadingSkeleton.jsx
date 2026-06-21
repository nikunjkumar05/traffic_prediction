import { memo, useMemo } from "react";

function LoadingSkeleton({ rows = 4, className = "" }) {
  const widths = useMemo(
    () => Array.from({ length: rows }, (_, i) => `${60 + ((i * 11) % 35)}%`),
    [rows],
  );

  return (
    <div className={`space-y-3 ${className}`}>
      {widths.map((width, i) => (
        <div
          key={i}
          className="h-4 bg-elevated rounded animate-pulse"
          style={{ width }}
        />
      ))}
    </div>
  );
}

export default memo(LoadingSkeleton);
