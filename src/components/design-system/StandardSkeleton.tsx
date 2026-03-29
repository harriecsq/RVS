import { memo } from "react";

const shimmerClass = "animate-pulse bg-[#F0F1F3] rounded";

/** A single rectangular shimmer bar */
export const SkeletonBar = memo(({
  width = "100%",
  height = "14px",
  className = "",
}: {
  width?: string | number;
  height?: string | number;
  className?: string;
}) => (
  <div
    className={`${shimmerClass} ${className}`}
    style={{ width, height, minWidth: typeof width === "number" ? width : undefined }}
  />
));
SkeletonBar.displayName = "SkeletonBar";

/** A single table data row shimmer */
export const SkeletonTableRow = memo(({ cols = 5 }: { cols?: number }) => {
  const widths = ["60%", "80%", "45%", "70%", "55%", "40%", "65%"];
  return (
    <div className="flex items-center gap-4 px-4 py-3 border-b border-[#F3F4F6]">
      {Array.from({ length: cols }).map((_, i) => (
        <div key={i} className="flex-1">
          <SkeletonBar height="13px" width={widths[i % widths.length]} />
        </div>
      ))}
    </div>
  );
});
SkeletonTableRow.displayName = "SkeletonTableRow";

/** Full table shimmer including a fake thead */
export const SkeletonTable = memo(({ rows = 6, cols = 5 }: { rows?: number; cols?: number }) => (
  <div className="border border-[#E5E9F0] rounded-[12px] overflow-hidden bg-white">
    {/* fake thead */}
    <div className="flex items-center gap-4 px-4 py-3 bg-[#F9FAFB] border-b border-[#E5E9F0]">
      {Array.from({ length: cols }).map((_, i) => (
        <div key={i} className="flex-1">
          <SkeletonBar height="10px" width="50%" />
        </div>
      ))}
    </div>
    {Array.from({ length: rows }).map((_, i) => (
      <SkeletonTableRow key={i} cols={cols} />
    ))}
  </div>
));
SkeletonTable.displayName = "SkeletonTable";
