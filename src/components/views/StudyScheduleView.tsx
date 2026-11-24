import React, { useState } from 'react';
import {
  Bell,
  BellRing,
  CalendarClock,
  Plus,
  Send,
  Trash2,
} from 'lucide-react';
import { useLingua } from '../../context/LinguaContext';
import type { StudyScheduleItem } from '../../types/lingua';
import { PageHeader, useToast } from '../ui/ToastAndPrimitives';

const DAY_LABELS = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

const FOCUS_OPTIONS: {
  value: StudyScheduleItem['focusArea'];
  label: string;
  desc: string;
}[] = [
  {
    value: 'vocabulary',
    label: 'Vocabulary Waiter & 7 Grammar Dasar',
    desc: 'Tambah kosakata waiter & kalimat di 7 grammar dasar.',
  },
  {
    value: 'grammar',
    label: '7 Grammar Dasar Waiter',
    desc: 'Latihan 30 soal & rumus 7 grammar dasar hotel/restoran.',
  },
  {
    value: 'sentence-builder',
    label: 'Sentence Builder',
    desc: 'Susun kalimat layanan tamu secara bebas dengan koreksi AI.',
  },
  {
    value: 'speaking-community',
    label: 'Speaking Partner (Script)',
    desc: 'Latihan dialog Waiter & Tamu dengan script tersinkron.',
  },
];

export function StudyScheduleView() {
  const {
    studySchedules,
    browserNotifPermission,
    requestBrowserNotificationPermission,
    addStudySchedule,
    toggleStudySchedule,
    deleteStudySchedule,
    testScheduleNotification,
  } = useLingua();
  const { showToast } = useToast();

  const [title, setTitle] = useState('Latihan Kosakata & Kalimat');
  const [focusArea, setFocusArea] =
    useState<StudyScheduleItem['focusArea']>('vocabulary');
  const [timeHHMM, setTimeHHMM] = useState('19:30');
  const [days, setDays] = useState<number[]>([]);
  const [note, setNote] = useState('');

  const toggleDay = (d: number) => {
    setDays((prev) =>
      prev.includes(d) ? prev.filter((item) => item !== d) : [...prev, d].sort()
    );
  };

  const handleEnableBrowserNotif = async () => {
    const perm = await requestBrowserNotificationPermission();
    if (perm === 'granted') {
      showToast('Notifikasi browser aktif', 'success', 'Pengingat jadwal akan muncul juga di OS/browser Anda.');
    } else if (perm === 'denied') {
      showToast(
        'Izin notifikasi browser ditolak',
        'info',
        'Pengingat in-app, lonceng, dan suara tetap muncul saat aplikasi terbuka.'
      );
    } else {
      showToast(
        'Browser membatasi Notification API',
        'info',
        'Gunakan pengingat in-app + suara yang sudah aktif otomatis.'
      );
    }
  };

  const handleCreateSchedule = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanTitle = title.trim() || 'Jadwal Belajar Bahasa Inggris';
    if (!timeHHMM) return;
    addStudySchedule({
      title: cleanTitle,
      focusArea,
      timeHHMM,
      days,
      enabled: true,
      note: note.trim() || undefined,
    });
    setNote('');
    showToast(
      'Jadwal belajar disimpan',
      'success',
      `Pengingat akan muncul pukul ${timeHHMM} (${
        days.length === 0 ? 'Setiap hari' : days.map((d) => DAY_LABELS[d]).join(', ')
      }).`
    );
  };

  return (
    <div className="max-w-4xl space-y-6">
      <PageHeader
        title="Jadwal Belajar & Notifikasi"
        subtitle="Atur pengingat belajar rutin untuk kosakata, grammar dasar, menyusun kalimat, dan latihan speaking dengan script."
        action={
          <button
            type="button"
            onClick={() => testScheduleNotification(studySchedules[0])}
            className="px-3.5 py-2 rounded-lg border border-[#E4E8EE] dark:border-[#263344] bg-white dark:bg-[#16202C] hover:bg-[#F7F8FA] dark:hover:bg-[#1E2B3B] text-xs font-semibold text-[#243447] dark:text-slate-200 flex items-center gap-2 transition-colors"
          >
            <BellRing className="w-3.5 h-3.5 text-[#3C8D8A]" />
            <span>Tes Notifikasi Sekarang</span>
          </button>
        }
      />

      {/* Notification Permission Banner */}
      <div className="p-4 rounded-xl bg-white dark:bg-[#16202C] border border-[#E4E8EE] dark:border-[#263344] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-[#E6F0ED] dark:bg-[#3C8D8A]/20 text-[#3C8D8A] shrink-0">
            <Bell className="w-4 h-4" />
          </div>
          <div className="space-y-0.5 text-xs">
            <div className="font-semibold text-[#243447] dark:text-white">
              Status Notifikasi:{' '}
              {browserNotifPermission === 'granted'
                ? 'Notifikasi Browser & In-App Aktif'
                : browserNotifPermission === 'denied'
                ? 'In-App Banner & Suara Aktif (Notifikasi Browser Diblokir)'
                : 'In-App Banner & Suara Aktif'}
            </div>
            <p className="text-[#718096] dark:text-slate-400">
              Saat waktu jadwal tiba, banner pengingat, daftar notifikasi di ikon lonceng, nada pengingat,
              dan notifikasi browser (jika diizinkan) akan muncul otomatis.
            </p>
          </div>
        </div>

        {browserNotifPermission !== 'granted' && browserNotifPermission !== 'unsupported' && (
          <button
            type="button"
            onClick={handleEnableBrowserNotif}
            className="px-3.5 py-2 rounded-lg bg-[#3C8D8A] hover:bg-[#317572] text-white text-xs font-semibold whitespace-nowrap shrink-0 transition-colors"
          >
            Aktifkan Notifikasi Browser
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Create New Schedule Form */}
        <form
          onSubmit={handleCreateSchedule}
          className="lg:col-span-5 bg-white dark:bg-[#16202C] border border-[#E4E8EE] dark:border-[#263344] rounded-xl p-5 space-y-4"
        >
          <h2 className="text-base font-semibold text-[#243447] dark:text-white">
            Buat Jadwal Baru
          </h2>

          <div className="space-y-1.5">
            <label
              htmlFor="schedule-title"
              className="block text-xs font-semibold text-[#718096]"
            >
              Judul Pengingat
            </label>
            <input
              id="schedule-title"
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Contoh: Tambah 3 Kata + Latihan Kalimat"
              className="w-full px-3 py-2 rounded-lg border border-[#E4E8EE] dark:border-[#263344] bg-[#F7F8FA] dark:bg-[#1E2B3B] text-sm focus:outline-none focus:ring-2 focus:ring-[#3C8D8A]/40"
            />
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="schedule-focus"
              className="block text-xs font-semibold text-[#718096]"
            >
              Fokus Latihan
            </label>
            <select
              id="schedule-focus"
              value={focusArea}
              onChange={(e) =>
                setFocusArea(e.target.value as StudyScheduleItem['focusArea'])
              }
              className="w-full px-3 py-2 rounded-lg border border-[#E4E8EE] dark:border-[#263344] bg-[#F7F8FA] dark:bg-[#1E2B3B] text-sm focus:outline-none focus:ring-2 focus:ring-[#3C8D8A]/40"
            >
              {FOCUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value} className="dark:bg-[#16202C]">
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="schedule-time"
              className="block text-xs font-semibold text-[#718096]"
            >
              Jam Pengingat
            </label>
            <input
              id="schedule-time"
              type="time"
              required
              value={timeHHMM}
              onChange={(e) => setTimeHHMM(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-[#E4E8EE] dark:border-[#263344] bg-[#F7F8FA] dark:bg-[#1E2B3B] text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#3C8D8A]/40"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#718096]">Hari</span>
              <button
                type="button"
                onClick={() => setDays([])}
                className={`text-[11px] font-semibold ${
                  days.length === 0 ? 'text-[#3C8D8A]' : 'text-[#718096] hover:text-[#243447]'
                }`}
              >
                {days.length === 0 ? 'Setiap Hari aktif' : 'Pilih Setiap Hari'}
              </button>
            </div>
            <div className="grid grid-cols-7 gap-1">
              {DAY_LABELS.map((label, idx) => {
                const picked = days.includes(idx);
                return (
                  <button
                    key={label}
                    type="button"
                    onClick={() => toggleDay(idx)}
                    className={`py-1.5 rounded-lg text-[11px] font-semibold border transition-colors ${
                      picked
                        ? 'bg-[#243B53] border-[#243B53] text-white'
                        : 'border-[#E4E8EE] dark:border-[#263344] bg-[#F7F8FA] dark:bg-[#1E2B3B] text-[#486581] dark:text-slate-300'
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
            <p className="text-[11px] text-[#718096]">
              Kosongkan pilihan hari jika ingin pengingat muncul setiap hari.
            </p>
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="schedule-note"
              className="block text-xs font-semibold text-[#718096]"
            >
              Catatan Singkat (Opsional)
            </label>
            <input
              id="schedule-note"
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Misal: Buat 5 kalimat Simple Past & Present Perfect"
              className="w-full px-3 py-2 rounded-lg border border-[#E4E8EE] dark:border-[#263344] bg-[#F7F8FA] dark:bg-[#1E2B3B] text-sm focus:outline-none focus:ring-2 focus:ring-[#3C8D8A]/40"
            />
          </div>

          <button
            type="submit"
            className="w-full py-2.5 rounded-lg bg-[#243B53] hover:bg-[#1B2D40] text-white text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Simpan Jadwal Belajar</span>
          </button>
        </form>

        {/* Active Schedule List */}
        <div className="lg:col-span-7 bg-white dark:bg-[#16202C] border border-[#E4E8EE] dark:border-[#263344] rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-[#243447] dark:text-white">
              Daftar Jadwal ({studySchedules.length})
            </h2>
            <span className="text-xs text-[#718096]">
              {studySchedules.filter((s) => s.enabled).length} aktif
            </span>
          </div>

          {studySchedules.length === 0 ? (
            <div className="py-10 text-center space-y-2">
              <CalendarClock className="w-7 h-7 text-[#A0AEC0] mx-auto" />
              <p className="text-sm font-medium text-[#243447] dark:text-white">
                Belum ada jadwal belajar
              </p>
              <p className="text-xs text-[#718096]">
                Tambahkan jadwal di sebelah kiri agar aplikasi mengingatkan Anda tepat waktu.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {studySchedules.map((item) => {
                const focusMeta = FOCUS_OPTIONS.find((f) => f.value === item.focusArea);
                const dayLabel =
                  item.days.length === 0
                    ? 'Setiap hari'
                    : item.days.map((d) => DAY_LABELS[d]).join(', ');
                return (
                  <div
                    key={item.id}
                    className={`p-4 rounded-xl border transition-colors ${
                      item.enabled
                        ? 'border-[#C3DED6] dark:border-[#3C8D8A]/40 bg-[#E6F0ED]/35 dark:bg-[#3C8D8A]/10'
                        : 'border-[#E4E8EE] dark:border-[#263344] bg-[#F7F8FA] dark:bg-[#1E2B3B]/60 opacity-75'
                    }`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="space-y-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-base font-semibold text-[#243B53] dark:text-white">
                            {item.timeHHMM}
                          </span>
                          <span className="text-xs font-medium text-[#3C8D8A] bg-white dark:bg-[#16202C] px-2 py-0.5 rounded border border-[#E4E8EE] dark:border-[#263344]">
                            {focusMeta?.label || item.focusArea}
                          </span>
                        </div>
                        <div className="text-sm font-semibold text-[#243447] dark:text-white">
                          {item.title}
                        </div>
                        <div className="text-xs text-[#718096] dark:text-slate-400">
                          {dayLabel}
                          {item.note ? ` · ${item.note}` : ''}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => testScheduleNotification(item)}
                          title="Kirim tes notifikasi untuk jadwal ini"
                          className="px-2.5 py-1.5 rounded-lg border border-[#E4E8EE] dark:border-[#263344] bg-white dark:bg-[#16202C] text-xs font-semibold text-[#243447] dark:text-slate-200 hover:bg-[#F7F8FA] flex items-center gap-1"
                        >
                          <Send className="w-3 h-3 text-[#3C8D8A]" />
                          <span>Tes</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => toggleStudySchedule(item.id)}
                          className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                            item.enabled
                              ? 'bg-[#3C8D8A] text-white'
                              : 'bg-[#E4E8EE] dark:bg-[#263344] text-[#486581] dark:text-slate-300'
                          }`}
                        >
                          {item.enabled ? 'Aktif' : 'Nonaktif'}
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteStudySchedule(item.id)}
                          aria-label={`Hapus jadwal ${item.title}`}
                          className="p-1.5 rounded-lg text-[#A0AEC0] hover:text-[#D65A5A] hover:bg-[#FDF2F2] dark:hover:bg-[#D65A5A]/15 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
