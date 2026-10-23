import { useState, useEffect } from 'preact/hooks';

interface Agenda {
  id: string;
  title: string;
  description: string;
  event_date: string;
  event_time: string;
  location: string;
  wa_link: string;
  image_url?: string;
}

export default function AgendaIsland() {
  const [agenda, setAgenda] = useState<Agenda | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAgenda() {
      try {
        const res = await fetch('/api/agendas');
        const data = await res.json();
        setAgenda(data);
      } catch (err) {
        console.error("Gagal memuat agenda home:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchAgenda();
  }, []);

  const formatDate = (dateString: string) => {
    if (dateString === 'Setiap Hari Minggu') return dateString;
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return dateString;
    return date.toLocaleDateString('id-ID', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="relative overflow-hidden rounded-[2rem] border border-slate-200 bg-white p-4 shadow-sm md:rounded-[2.5rem] md:p-6">
        <div className="grid animate-pulse grid-cols-1 gap-6 md:grid-cols-12 md:gap-8">
          <div className="aspect-[4/3] rounded-3xl bg-slate-100 md:col-span-5 md:aspect-auto md:min-h-[420px]" />
          <div className="space-y-5 md:col-span-7 md:p-4">
            <div className="h-6 w-32 rounded-full bg-slate-100" />
            <div className="h-10 w-3/4 rounded-xl bg-slate-100" />
            <div className="h-16 w-full rounded-xl bg-slate-100" />
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="h-20 rounded-2xl bg-slate-100" />
              <div className="h-20 rounded-2xl bg-slate-100" />
            </div>
            <div className="h-12 w-48 rounded-2xl bg-slate-100" />
          </div>
        </div>
      </div>
    );
  }

  const displayAgenda = agenda || {
    id: 'fallback',
    title: 'Buka Lapak Buku Gratis',
    description: 'Mari merawat nalar dan menjalin kedekatan melalui lapak baca gratis dan diskusi santai. Terbuka untuk umum se-Kabupaten Brebes.',
    event_date: 'Setiap Hari Minggu pagi',
    event_time: '09:00',
    location: 'Nomaden (Pindah-pindah)',
    wa_link: 'https://wa.me/628993986415',
    image_url: '/kegiatan.webp'
  };

  const eventDate = new Date(displayAgenda.event_date);
  const dateBadge = Number.isNaN(eventDate.getTime())
    ? null
    : {
        day: eventDate.getDate(),
        month: eventDate.toLocaleDateString('id-ID', { month: 'short' }),
      };

  return (
    <article className="group relative overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-lift md:rounded-[2.5rem]">
      <div className="grid grid-cols-1 md:grid-cols-12">
        <div className="relative min-h-[300px] overflow-hidden bg-slate-100 md:col-span-5 md:min-h-[440px]">
          <img
            src={displayAgenda.image_url || "/literasi-brebesan.webp"}
            alt={displayAgenda.title}
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-slate-950/10 to-transparent" aria-hidden="true"></div>

          <div className="absolute left-4 top-4 rounded-2xl border border-white/60 bg-white/95 px-4 py-3 text-center shadow-lg backdrop-blur md:left-6 md:top-6">
            {dateBadge ? (
              <>
                <p className="text-2xl font-black leading-none text-slate-900">{dateBadge.day}</p>
                <p className="mt-1 text-[9px] font-black uppercase tracking-widest text-blue-600">{dateBadge.month}</p>
              </>
            ) : (
              <p className="text-[10px] font-black uppercase tracking-widest text-blue-600">Rutin</p>
            )}
          </div>

          <p className="absolute bottom-4 left-4 right-4 text-[10px] font-black uppercase tracking-widest text-white/80 md:bottom-6 md:left-6">
            Agenda komunitas
          </p>
        </div>

        <div className="flex flex-col p-6 md:col-span-7 md:p-10">
          <div className="eyebrow w-fit border-amber-100 bg-amber-50 text-amber-700">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500" aria-hidden="true"></span>
            Segera hadir
          </div>

          <h3 className="mt-4 text-2xl font-black leading-tight tracking-tight text-slate-900 md:text-3xl xl:text-4xl">
            {displayAgenda.title}
          </h3>

          <p className="mt-3 text-sm leading-relaxed text-slate-500 md:text-base">
            {displayAgenda.description}
          </p>

          <dl className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="flex items-start gap-3 rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white">
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
              </div>
              <div className="min-w-0">
                <dt className="text-[10px] font-black uppercase tracking-widest text-slate-400">Waktu</dt>
                <dd className="mt-1 text-sm font-bold leading-snug text-slate-900">{formatDate(displayAgenda.event_date)}</dd>
                <dd className="mt-0.5 text-xs font-medium text-slate-500">{displayAgenda.event_time} WIB</dd>
              </div>
            </div>

            <div className="flex items-start gap-3 rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-white">
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></svg>
              </div>
              <div className="min-w-0">
                <dt className="text-[10px] font-black uppercase tracking-widest text-slate-400">Lokasi</dt>
                <dd className="mt-1 text-sm font-bold leading-snug text-slate-900">{displayAgenda.location}</dd>
                <dd className="mt-0.5 text-xs font-medium text-slate-500">Terbuka untuk umum</dd>
              </div>
            </div>
          </dl>

          <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center">
            <a
              href={displayAgenda.wa_link}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-6 py-3.5 text-[11px] font-black uppercase tracking-widest text-white shadow-glow transition-all hover:-translate-y-0.5 hover:bg-blue-700"
            >
              Ikut Kegiatan
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" aria-hidden="true"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
            </a>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Konfirmasi lewat WhatsApp</p>
          </div>
        </div>
      </div>
    </article>
  );
}
