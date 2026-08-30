import { Button } from "./Button";

export function Pagination({
  page,
  pageCount,
  onChange,
}: {
  page: number;
  pageCount: number;
  onChange: (page: number) => void;
}) {
  if (pageCount <= 1) return null;

  return (
    <div className="flex items-center justify-between gap-3 pt-1">
      <span className="text-xs text-black/50">
        Page {page} of {pageCount}
      </span>
      <div className="flex gap-1.5">
        <Button
          variant="secondary"
          className="!px-2.5 !py-1 text-xs"
          disabled={page <= 1}
          onClick={() => onChange(page - 1)}
        >
          Prev
        </Button>
        <Button
          variant="secondary"
          className="!px-2.5 !py-1 text-xs"
          disabled={page >= pageCount}
          onClick={() => onChange(page + 1)}
        >
          Next
        </Button>
      </div>
    </div>
  );
}
