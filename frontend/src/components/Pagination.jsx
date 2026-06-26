/**
 * FILE_GUIDE: Pagination.jsx — Nút phân trang tái sử dụng (Trước/Sau, số trang)
 */

/**
 * Component phân trang tái sử dụng.
 * @param {number} page - Trang hiện tại (1-based)
 * @param {number} total - Tổng số bản ghi
 * @param {number} limit - Số bản ghi mỗi trang
 * @param {function} onPageChange - Callback khi user chọn trang mới
 */
function Pagination({ page, total, limit, onPageChange }) {
  // Tính tổng số trang; tối thiểu 1 để tránh chia cho 0
  const totalPages = Math.max(1, Math.ceil((total || 0) / (limit || 1)));
  // Ẩn hoàn toàn nếu chỉ có 1 trang (không cần phân trang)
  if (totalPages <= 1) return null;

  // Mảng số trang hiển thị — cửa sổ ±2 quanh trang hiện tại
  const pages = [];
  const start = Math.max(1, page - 2);
  const end = Math.min(totalPages, page + 2);
  for (let i = start; i <= end; i += 1) {
    pages.push(i);
  }

  return (
    <div className="flex flex-wrap items-center justify-center gap-2 mt-6">
      {/* Nút lùi 1 trang — disabled khi đang ở trang 1 */}
      <button
        type="button"
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
        className="rounded-button border border-slate-200 px-3 py-1.5 text-xs text-slate-600 disabled:opacity-40 hover:bg-slate-50"
      >
        Trước
      </button>
      {/* Các nút số trang trong cửa sổ — trang hiện tại được highlight */}
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
      {/* Nút tiến 1 trang — disabled khi đang ở trang cuối */}
      <button
        type="button"
        disabled={page >= totalPages}
        onClick={() => onPageChange(page + 1)}
        className="rounded-button border border-slate-200 px-3 py-1.5 text-xs text-slate-600 disabled:opacity-40 hover:bg-slate-50"
      >
        Sau
      </button>
      {/* Thông tin tóm tắt: trang hiện tại / tổng trang và tổng mục */}
      <span className="text-xs text-slate-500 ml-2">
        Trang {page}/{totalPages} ({total} mục)
      </span>
    </div>
  );
}

export default Pagination;
