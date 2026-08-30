import type { HTMLAttributes } from "react";

export function CornerMarks() {
  return (
    <>
      <span className="corner-mark tl" aria-hidden />
      <span className="corner-mark tr" aria-hidden />
      <span className="corner-mark bl" aria-hidden />
      <span className="corner-mark br" aria-hidden />
    </>
  );
}

interface BlueprintProps extends HTMLAttributes<HTMLDivElement> {
  border?: boolean;
}

export function Blueprint({ border = true, className = "", children, ...rest }: BlueprintProps) {
  return (
    <div
      className={`relative rounded-none ${border ? "border border-divider" : ""} ${className}`}
      {...rest}
    >
      <CornerMarks />
      {children}
    </div>
  );
}
