import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { PublicApi, getAuthToken, getAuthUser, authHeaders, FILE_BASE } from '../services/api';
import PublicNavbar from '../components/PublicNavbar';
import PublicFooter from '../components/PublicFooter';

function formatLocalDate(date) {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function BookAppointmentPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    full_name: '',
    phone: '',
    email: '',
    service_id: '',
    work_date: '',
    shift_id: '',
    dentist_id: '',
    slot_time: '',
    appointment_time: '',
    note: '',
  });
  const [useAccount, setUseAccount] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [services, setServices] = useState([]);
  const [allDentists, setAllDentists] = useState([]);
  const [availableDates, setAvailableDates] = useState([]);
  const [shiftsForDate, setShiftsForDate] = useState([]);
  const [dentistsForBooking, setDentistsForBooking] = useState([]);
  const [slots, setSlots] = useState([]);
  const isLoggedIn = !!getAuthToken();
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return formatLocalDate(d);
  });

  useEffect(() => {
    PublicApi.getServices().then(setServices).catch(() => setServices([]));
  }, []);

  useEffect(() => {
    PublicApi.getDentists().then(setAllDentists).catch(() => setAllDentists([]));
  }, []);

  useEffect(() => {
    if (form.service_id) {
      PublicApi.getAvailableDates(form.service_id, form.dentist_id || undefined)
        .then((r) => setAvailableDates(r.dates || []))
        .catch(() => setAvailableDates([]));
    } else {
      setAvailableDates([]);
    }
  }, [form.service_id, form.dentist_id]);

  useEffect(() => {
    if (availableDates.length) {
      const [y, m] = String(availableDates[0]).split('-').map(Number);
      const d = new Date(y || new Date().getFullYear(), (m || 1) - 1, 1);
      setCalendarMonth(formatLocalDate(d));
    }
  }, [availableDates]);

  // Nếu đang chọn ngày nhưng ngày đó không còn trong danh sách ngày khả dụng (do đổi bác sĩ/dịch vụ),
  // tự động reset lại ngày/ca/giờ để tránh tình trạng ngày đang chọn nhưng không có ca nào.
  useEffect(() => {
    if (form.work_date && !availableDates.includes(form.work_date)) {
      setForm((prev) => ({
        ...prev,
        work_date: '',
        shift_id: '',
        slot_time: '',
        appointment_time: '',
      }));
    }
  }, [availableDates, form.work_date]);

  useEffect(() => {
    if (form.service_id && form.work_date) {
      PublicApi.getShiftsForDate(form.service_id, form.work_date, form.dentist_id || undefined)
        .then(setShiftsForDate)
        .catch(() => setShiftsForDate([]));
    } else {
      setShiftsForDate([]);
    }
  }, [form.service_id, form.work_date, form.dentist_id]);

  useEffect(() => {
    if (form.service_id && form.shift_id && form.work_date) {
      PublicApi.getDentistsForBooking(form.service_id, form.shift_id, form.work_date)
        .then(setDentistsForBooking)
        .catch(() => setDentistsForBooking([]));
    } else {
      setDentistsForBooking([]);
    }
  }, [form.service_id, form.shift_id, form.work_date]);

  useEffect(() => {
    if (form.service_id && form.dentist_id && form.shift_id && form.work_date) {
      PublicApi.getSlotsForBooking(
        form.service_id,
        form.dentist_id,
        form.shift_id,
        form.work_date
      )
        .then((r) => setSlots(r.slots || []))
        .catch(() => setSlots([]));
    } else {
      setSlots([]);
    }
  }, [form.service_id, form.dentist_id, form.shift_id, form.work_date]);

  useEffect(() => {
    if (isLoggedIn && useAccount) {
      const u = getAuthUser();
      if (u) {
        setForm((prev) => ({
          ...prev,
          full_name: u.full_name || prev.full_name,
          phone: u.phone || prev.phone,
          email: u.email || prev.email,
        }));
      }
    }
  }, [isLoggedIn, useAccount]);

  const selectedService = services.find((s) => String(s.id) === String(form.service_id));
  const selectedShift = shiftsForDate.find((s) => String(s.id) === String(form.shift_id));
  const selectedDentist = dentistsForBooking.find((d) => String(d.id) === String(form.dentist_id));

  const dentistsForService = useMemo(() => {
    if (!selectedService) return [];
    const ids = selectedService.dentist_ids || [];
    if (!ids.length) return [];
    return (allDentists || []).filter((d) => ids.includes(d.id));
  }, [selectedService, allDentists]);

  const dentistOptions = form.shift_id && form.work_date ? dentistsForBooking : dentistsForService;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => {
      const next = { ...prev, [name]: value };
      if (name === 'service_id') {
        next.work_date = '';
        next.shift_id = '';
        next.dentist_id = '';
        next.slot_time = '';
        next.appointment_time = '';
      }
      if (name === 'work_date') {
        next.shift_id = '';
        next.dentist_id = '';
        next.slot_time = '';
        next.appointment_time = '';
      }
      if (name === 'shift_id') {
        next.dentist_id = '';
        next.slot_time = '';
        next.appointment_time = '';
      }
      if (name === 'dentist_id') {
        // Khi đổi bác sĩ, yêu cầu chọn lại ca và giờ khám cho phù hợp
        next.shift_id = '';
        next.slot_time = '';
        next.appointment_time = '';
      }
      if (name === 'slot_time' && value && form.work_date) {
        next.appointment_time = `${form.work_date}T${value}:00`;
      }
      return next;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      // Bắt buộc: dịch vụ, ngày, ca, bác sĩ và giờ khám cụ thể
      if (!form.service_id || !form.work_date || !form.shift_id || !form.dentist_id || !form.slot_time) {
        setSubmitting(false);
        setError('Vui lòng chọn đầy đủ dịch vụ, ngày, ca, bác sĩ và giờ khám cụ thể.');
        return;
      }

      const payload = {
        full_name: form.full_name,
        phone: form.phone,
        email: form.email,
        service_id: Number(form.service_id),
        note: form.note,
        use_account: isLoggedIn && useAccount,
      };
      payload.shift_id = Number(form.shift_id);
      payload.dentist_id = Number(form.dentist_id);
      // Luôn dùng giờ slot đã chọn
      payload.appointment_time = `${form.work_date}T${form.slot_time}:00`;

      const opts = isLoggedIn && useAccount ? { headers: authHeaders() } : {};
      const data = await PublicApi.createAppointment(payload, opts);
      navigate(`/dat-lich/thanh-cong/${data.id}`);
    } catch (err) {
      setError(err.message || 'Đặt lịch thất bại, vui lòng thử lại');
    } finally {
      setSubmitting(false);
    }
  };

  const calendarMonthDate = new Date(calendarMonth);
  const calYear = calendarMonthDate.getFullYear();
  const calMonth = calendarMonthDate.getMonth();
  const firstDayOfMonth = new Date(calYear, calMonth, 1);
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
  const startWeekday = (firstDayOfMonth.getDay() + 6) % 7; // 0 = Monday

  const todayStr = formatLocalDate(new Date());
  const availableSet = new Set(availableDates);

  const calendarCells = [];
  for (let i = 0; i < startWeekday; i += 1) {
    calendarCells.push(null);
  }
  for (let day = 1; day <= daysInMonth; day += 1) {
    calendarCells.push(day);
  }

  function formatMonthLabel(dateStr) {
    const d = new Date(dateStr);
    return d.toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' });
  }

  function changeCalendarMonth(delta) {
    const d = new Date(calendarMonth);
    d.setMonth(d.getMonth() + delta);
    d.setDate(1);
    setCalendarMonth(formatLocalDate(d));
  }

  const morningSlots = slots.filter((t) => {
    const h = Number(t.split(':')[0]);
    return Number.isFinite(h) && h < 12;
  });
  const afternoonSlots = slots.filter((t) => {
    const h = Number(t.split(':')[0]);
    return Number.isFinite(h) && h >= 12;
  });

  return (
    <div className="min-h-screen bg-bg-light flex flex-col">
      <PublicNavbar />

      <main className="flex-1 py-8 px-4 sm:px-6 lg:px-8">
        <form onSubmit={handleSubmit}>
          <div className="mx-auto max-w-6xl grid gap-8 lg:grid-cols-12">
            <section className="space-y-6 lg:col-span-8">
              <div>
                <h1 className="text-3xl md:text-4xl font-bold text-text-main mb-2">Đặt lịch khám</h1>
                <p className="text-sm text-slate-600 max-w-2xl">
                  Chọn dịch vụ, thời gian phù hợp và để phòng khám sắp xếp hoặc chọn bác sĩ mong muốn. Toàn bộ
                  quy trình chỉ mất chưa đến một phút.
                </p>
              </div>

              <div className="space-y-6">
              {/* Bước 1: Dịch vụ & ưu tiên bác sĩ */}
              <section className="bg-white rounded-xl shadow-sm border border-slate-100 p-4 md:p-6 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                    1
                  </div>
                  <h2 className="text-sm md:text-base font-semibold text-slate-900">
                    Bạn cần hỗ trợ dịch vụ gì?
                  </h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                  <div className="space-y-2">
                    <label className="block text-xs font-medium text-slate-700">
                      Loại dịch vụ
                    </label>
                    <div className="relative">
                      <select
                        name="service_id"
                        value={form.service_id}
                        onChange={handleChange}
                        className="block w-full rounded-lg border-slate-200 bg-white text-sm text-slate-900 focus:border-primary focus:ring-primary py-2.5 pl-3 pr-8"
                      >
                        <option value="">Chọn dịch vụ</option>
                        {services.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name} ({s.duration_minutes} phút)
                          </option>
                        ))}
                      </select>
                      <span className="material-icons absolute right-2 top-2.5 text-slate-400 text-base pointer-events-none">
                        expand_more
                      </span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="block text-xs font-medium text-slate-700">
                      Ưu tiên bác sĩ (tuỳ chọn)
                    </label>
                    <div className="relative">
                      <select
                        value={form.dentist_id}
                        onChange={(e) =>
                          handleChange({
                            target: { name: 'dentist_id', value: e.target.value },
                          })
                        }
                        className="block w-full rounded-lg border-slate-200 bg-white text-sm text-slate-900 focus:border-primary focus:ring-primary py-2.5 pl-3 pr-8"
                      >
                        <option value="">Không ưu tiên (để phòng khám sắp xếp)</option>
                        {dentistOptions.map((d) => (
                          <option key={d.id} value={d.id}>
                            {d.full_name}
                            {typeof d.slots_left === 'number'
                              ? ` (${d.slots_left} slot còn lại)`
                              : ''}
                          </option>
                        ))}
                      </select>
                      <span className="material-icons absolute right-2 top-2.5 text-slate-400 text-base pointer-events-none">
                        expand_more
                      </span>
                    </div>
                  </div>
                </div>
              </section>

              {/* Bước 2: Ngày & giờ */}
              <section className="bg-white rounded-xl shadow-sm border border-slate-100 p-4 md:p-6 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                    2
                  </div>
                  <h2 className="text-sm md:text-base font-semibold text-slate-900">
                    Chọn ngày và khung giờ
                  </h2>
                </div>
                <div className="flex flex-col md:flex-row gap-6">
                  <div className="md:w-1/2 space-y-3">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="text-xs font-medium text-slate-700">Chọn ngày khám</h3>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => changeCalendarMonth(-1)}
                          className="p-1 rounded-full text-slate-500 hover:bg-slate-100"
                        >
                          <span className="material-icons text-sm">chevron_left</span>
                        </button>
                        <div className="px-2 py-1 rounded-full bg-slate-50 text-[11px] font-medium text-slate-700">
                          {formatMonthLabel(calendarMonth)}
                        </div>
                        <button
                          type="button"
                          onClick={() => changeCalendarMonth(1)}
                          className="p-1 rounded-full text-slate-500 hover:bg-slate-100"
                        >
                          <span className="material-icons text-sm">chevron_right</span>
                        </button>
                      </div>
                    </div>
                    <div className="grid grid-cols-7 gap-1 text-center mb-1">
                      <span className="text-[10px] font-semibold text-slate-400">T2</span>
                      <span className="text-[10px] font-semibold text-slate-400">T3</span>
                      <span className="text-[10px] font-semibold text-slate-400">T4</span>
                      <span className="text-[10px] font-semibold text-slate-400">T5</span>
                      <span className="text-[10px] font-semibold text-slate-400">T6</span>
                      <span className="text-[10px] font-semibold text-slate-400">T7</span>
                      <span className="text-[10px] font-semibold text-slate-400">CN</span>
                    </div>
                    <div className="grid grid-cols-7 gap-1 text-xs">
                      {calendarCells.map((day, idx) => {
                        if (!day) {
                          return <div key={`empty-${idx}`} className="aspect-square" />;
                        }
                        const d = new Date(calYear, calMonth, day);
                        const dateStr = formatLocalDate(d);
                        const isAvailable = availableSet.has(dateStr);
                        const isPast = dateStr < todayStr;
                        const isSelected = form.work_date === dateStr;
                        const disabled = !isAvailable || isPast;
                        let className =
                          'aspect-square flex items-center justify-center rounded-lg border text-[11px]';
                        if (disabled) {
                          className += ' border-slate-100 text-slate-300 bg-slate-50 cursor-not-allowed';
                        } else if (isSelected) {
                          className +=
                            ' border-primary bg-primary text-white font-semibold shadow-sm shadow-primary/30';
                        } else {
                          className +=
                            ' border-slate-200 text-slate-700 hover:border-primary hover:bg-primary/5';
                        }
                        return (
                          <button
                            key={dateStr}
                            type="button"
                            disabled={disabled}
                            onClick={() =>
                              setForm((prev) => ({
                                ...prev,
                                work_date: dateStr,
                              }))
                            }
                            className={className}
                          >
                            {day}
                          </button>
                        );
                      })}
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Chỉ chọn được ngày có bác sĩ trực cho dịch vụ đã chọn.
                    </p>
                  </div>
                  <div className="md:w-1/2 space-y-4">
                    <div>
                      <p className="text-xs font-medium text-slate-600 mb-2">Ca trong ngày</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {shiftsForDate.map((sh) => (
                          <button
                            key={sh.id}
                            type="button"
                            disabled={sh.is_full}
                            onClick={() =>
                              setForm((prev) => ({
                                ...prev,
                                shift_id: String(sh.id),
                              }))
                            }
                            className={`rounded-xl border-2 p-3 text-left text-xs transition ${
                              sh.is_full
                                ? 'border-slate-100 bg-slate-50 cursor-not-allowed opacity-60'
                                : form.shift_id === String(sh.id)
                                  ? 'border-primary bg-primary/5'
                                  : 'border-slate-200 hover:border-primary hover:bg-primary/5'
                            }`}
                          >
                            <p className="font-semibold text-slate-800 text-sm">{sh.name}</p>
                            <p className="text-[11px] text-slate-600">
                              {String(sh.start_time).slice(0, 5)} – {String(sh.end_time).slice(0, 5)}
                            </p>
                            <p
                              className={`mt-1 text-[11px] ${
                                sh.is_full ? 'text-red-600' : 'text-green-600'
                              }`}
                            >
                              {sh.is_full ? 'Đã đầy' : `Còn ${sh.slots_left} slot`}
                            </p>
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-slate-600 mb-2">
                        Giờ khám cụ thể
                      </p>
                      {form.dentist_id && slots.length > 0 ? (
                        <div className="space-y-3">
                          {morningSlots.length > 0 && (
                            <div>
                              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1">
                                Buổi sáng
                              </p>
                              <div className="flex flex-wrap gap-2">
                                {morningSlots.map((t) => (
                                  <button
                                    key={t}
                                    type="button"
                                    onClick={() =>
                                      setForm((prev) => ({
                                        ...prev,
                                        slot_time: t,
                                        appointment_time: `${form.work_date}T${t}:00`,
                                      }))
                                    }
                                    className={`rounded-lg px-3 py-1.5 text-xs ${
                                      form.slot_time === t
                                        ? 'bg-primary text-white'
                                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                                    }`}
                                  >
                                    {t}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                          {afternoonSlots.length > 0 && (
                            <div>
                              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1">
                                Buổi chiều
                              </p>
                              <div className="flex flex-wrap gap-2">
                                {afternoonSlots.map((t) => (
                                  <button
                                    key={t}
                                    type="button"
                                    onClick={() =>
                                      setForm((prev) => ({
                                        ...prev,
                                        slot_time: t,
                                        appointment_time: `${form.work_date}T${t}:00`,
                                      }))
                                    }
                                    className={`rounded-lg px-3 py-1.5 text-xs ${
                                      form.slot_time === t
                                        ? 'bg-primary text-white'
                                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                                    }`}
                                  >
                                    {t}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <p className="text-[11px] text-slate-500">
                          Vui lòng chọn ca, sau đó chọn bác sĩ và giờ khám cụ thể để tiếp tục.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </section>

              {/* Bước 3: Thông tin bệnh nhân */}
              <section className="bg-white rounded-xl shadow-sm border border-slate-100 p-4 md:p-6 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                    3
                  </div>
                  <h2 className="text-sm md:text-base font-semibold text-slate-900">
                    Thông tin của bạn
                  </h2>
                </div>
                <div className="space-y-4">
                  {isLoggedIn && (
                    <div className="flex p-1 bg-slate-100 rounded-xl gap-1">
                      <button
                        type="button"
                        onClick={() => setUseAccount(false)}
                        className={`flex-1 py-2 rounded-lg text-xs font-medium ${
                          !useAccount ? 'bg-white shadow' : ''
                        }`}
                      >
                        Nhập thủ công
                      </button>
                      <button
                        type="button"
                        onClick={() => setUseAccount(true)}
                        className={`flex-1 py-2 rounded-lg text-xs font-medium ${
                          useAccount ? 'bg-white shadow' : ''
                        }`}
                      >
                        Dùng thông tin tài khoản
                      </button>
                    </div>
                  )}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">
                        Họ và tên *
                      </label>
                      <input
                        name="full_name"
                        value={form.full_name}
                        onChange={handleChange}
                        readOnly={useAccount}
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">
                        Số điện thoại *
                      </label>
                      <input
                        name="phone"
                        value={form.phone}
                        onChange={handleChange}
                        readOnly={useAccount}
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      Email
                    </label>
                    <input
                      name="email"
                      type="email"
                      value={form.email}
                      onChange={handleChange}
                      readOnly={useAccount}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      Ghi chú
                    </label>
                    <textarea
                      name="note"
                      rows={2}
                      value={form.note}
                      onChange={handleChange}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                      placeholder="Triệu chứng, yêu cầu đặc biệt..."
                    />
                  </div>
                </div>
              </section>

              {error && (
                <div className="rounded-lg bg-red-50 px-4 py-3 text-xs text-red-600">{error}</div>
              )}
            </div>
            </section>

            <aside className="space-y-4 lg:col-span-4">
              <div className="rounded-2xl bg-white p-5 shadow-sm border border-primary/10">
                <h2 className="text-sm font-semibold text-text-main mb-4 border-b border-slate-100 pb-2">
                  Tóm tắt lịch hẹn
                </h2>
                <div className="mt-2 grid gap-2 text-xs text-slate-600">
                <div className="flex justify-between">
                  <span>Dịch vụ</span>
                  <span className="font-medium">{selectedService?.name || '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span>Ngày</span>
                  <span className="font-medium">{form.work_date || '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span>Ca</span>
                  <span className="font-medium">{selectedShift?.name || '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span>Bác sĩ</span>
                  <span className="font-medium">
                    {selectedDentist?.full_name || (form.shift_id ? 'Để phòng khám sắp xếp' : '—')}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Giờ</span>
                  <span className="font-medium">
                    {form.slot_time ||
                      (form.appointment_time ? form.appointment_time.slice(11, 16) : 'Trong ca')}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Họ tên</span>
                  <span className="font-medium">{form.full_name || '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span>SĐT</span>
                  <span className="font-medium">{form.phone || '—'}</span>
                </div>
                </div>
                <div className="mt-4 flex justify-end">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="inline-flex items-center rounded-button bg-primary px-5 py-2 text-sm font-semibold text-white shadow hover:bg-primary/90 disabled:opacity-60"
                  >
                    {submitting ? 'Đang gửi...' : 'Xác nhận đặt lịch'}
                  </button>
                </div>
              </div>
              <div className="rounded-2xl bg-primary/5 p-4 text-xs text-slate-700">
                <div className="font-semibold text-text-main">Lưu ý</div>
                <ul className="mt-2 space-y-1 list-disc pl-4">
                  <li>Đến trước giờ hẹn 5–10 phút.</li>
                  <li>Đem theo phim X-quang cũ (nếu có).</li>
                  <li>Thông báo bệnh lý nền hoặc đang mang thai.</li>
                </ul>
              </div>
            </aside>
          </div>
        </form>
      </main>

      <PublicFooter />
    </div>
  );
}

export default BookAppointmentPage;
