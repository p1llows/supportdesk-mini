import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface TablePaginationProps {
  page: number;
  pageSize: number;
  totalItems: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
}

export function TablePagination({
  page,
  pageSize,
  totalItems,
  onPageChange,
  onPageSizeChange,
}: TablePaginationProps) {
  if (totalItems === 0) return null;

  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * pageSize + 1;
  const end = Math.min(safePage * pageSize, totalItems);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#E5E2DA] bg-[#FAF9F6] px-5 py-3 text-xs text-stone-500">
      <div className="flex items-center gap-3">
        <span className="tabular-nums">
          Showing {start}–{end} of {totalItems}
        </span>
        <label className="inline-flex items-center gap-1.5">
          <span>Rows</span>
          <select
            aria-label="Rows per page"
            value={pageSize}
            onChange={(e) => {
              onPageSizeChange(Number(e.target.value));
              onPageChange(1);
            }}
            className="dark-select h-7 rounded-md border px-1.5 text-xs font-medium"
          >
            <option value={5}>5</option>
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
          </select>
        </label>
      </div>
      <div className="flex items-center gap-1.5">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(Math.max(1, safePage - 1))}
          disabled={safePage <= 1}
          className="h-7 px-2 text-xs"
        >
          <ChevronLeft className="mr-0.5 h-3.5 w-3.5" />
          Prev
        </Button>
        <span className="px-2 font-mono tabular-nums text-stone-700">
          {safePage} / {totalPages}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(Math.min(totalPages, safePage + 1))}
          disabled={safePage >= totalPages}
          className="h-7 px-2 text-xs"
        >
          Next
          <ChevronRight className="ml-0.5 h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
