function PublicFooter() {
  return (
    <footer className="mt-10 border-t border-slate-200 bg-white">
      <div className="mx-auto max-w-6xl px-4 py-5 flex flex-col md:flex-row items-center justify-between gap-3 text-xs text-slate-500">
        <div className="flex items-center gap-2">
          <img src="/logo.svg" alt="Nha Khoa" className="h-8 w-8 rounded-lg object-cover" />
          <div>
            <div className="font-semibold text-text-main text-xs">NHA KHOA</div>
            <div className="text-[11px] text-slate-500">
              © {new Date().getFullYear()} Nha khoa Demo. Tất cả quyền được bảo lưu.
            </div>
          </div>
        </div>
        <div className="flex flex-col items-center md:items-end gap-1 text-[11px]">
          <div className="flex items-center gap-4">
            <a href="/terms" className="hover:text-primary">
              Điều khoản & bảo mật
            </a>
            <a href="/maintenance" className="hover:text-primary">
              Tình trạng hệ thống
            </a>
          </div>
          <div className="text-slate-500">
            Hotline: <span className="font-semibold text-text-main">028 1234 5678</span> ·
            Email: contact@nhakhoademo.vn
          </div>
        </div>
      </div>
    </footer>
  );
}

export default PublicFooter;

