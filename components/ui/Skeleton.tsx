export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`bg-active rounded-sm ${className}`} />;
}
