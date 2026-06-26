/**
 * FILE_GUIDE: Pagination.jsx — Nút phân trang tái sử dụng (Trước/Sau, số trang)
 */
function Pagination({ page, total, limit, onPageChange }) {
  const totalPages = Math.max(1, Math.ceil((total || 0) / (limit || 1)));
  if (totalPages <= 1) return null;

  const pages = [];
  const start = Math.max(1, page - 2);
  const end = Math.min(totalPages, page + 2);
  for (let i = start; i <= end; i += 1) {
    pages.push(i);
  }

  return (
    <div className="flex flex-wrap items-center justify-center gap-2 mt-6">
      <button
        type="button"
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
        className="rounded-button border border-slate-200 px-3 py-1.5 text-xs text-slate-600 disabled:opacity-40 hover:bg-slate-50"
      >
        Trước
      </button>
      {pages.map((p) => (
        <button
          key={p}
          type="button"
          onClick={() => onPageChange(p)}
          className={`min-w-[2rem] rounded-button border px-3 py-1.5 text-xs ${
            p === page
              ? 'border-primary bg-primary text-white'
              : 'border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          {p}
        </button>
      ))}
      <button
        type="button"
        disabled={page >= totalPages}
        onClick={() => onPageChange(page + 1)}
        className="rounded-button border border-slate-200 px-3 py-1.5 text-xs text-slate-600 disabled:opacity-40 hover:bg-slate-50"
      >
        Sau
      </button>
      <span className="text-xs text-slate-500 ml-2">
        Trang {page}/{totalPages} ({total} mục)
      </span>
    </div>
  );
}

export default Pagination;
