import { Button } from "./Button";

export function Pagination({
  page,
  pageSize,
  total,
  onChange,
}: {
  page: number;
  pageSize: number;
  total: number;
  onChange: (page: number) => void;
}) {
  if (total === 0) return null;
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  const pageCount = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-xs text-muted tabular-nums">
        {from}–{to} of {total}
      </span>
      {pageCount > 1 && (
        <div className="flex gap-2">
          <Button disabled={page <= 1} onClick={() => onChange(page - 1)}>
            Previous
          </Button>
          <Button disabled={page >= pageCount} onClick={() => onChange(page + 1)}>
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
