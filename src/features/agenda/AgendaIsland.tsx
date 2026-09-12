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
    return new Date(dateString).toLocaleDateString('id-ID', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="group relative bg-slate-50 rounded-[1.5rem] md:rounded-3xl p-5 md:p-10 border border-slate-200 animate-pulse">
        <div className="flex flex-col md:flex-row gap-6 md:gap-10 items-center md:items-start">
          <div className="w-1/2 md:w-1/3 aspect-[3/4] bg-slate-200 rounded-2xl shrink-0" />
          <div className="w-full md:w-2/3 space-y-6">
            <div className="h-8 md:h-10 bg-slate-200 rounded-xl w-3/4" />
            <div className="h-16 md:h-20 bg-slate-200 rounded-xl w-full" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="h-14 md:h-16 bg-slate-200 rounded-xl" />
              <div className="h-14 md:h-16 bg-slate-200 rounded-xl" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  const displayAgenda = agenda || {
    id: 'fallback',
    title: 'Buka Lapak Buku Gratiss...',
    description: 'Mari merawat nalar dan menjalin kedekatan melalui lapak baca gratis dan diskusi santai. Terbuka untuk umum se-Kabupaten Brebes.',
    event_date: 'Setiap Hari Minggu pagi',
    event_time: '09:00',
    location: 'Nomaden (Pindah-pindah)',
    wa_link: 'https://wa.me/628993986415',
    image_url: '/kegiatan.webp'
  };

  return (
    <div className="group relative bg-slate-50 rounded-[1.5rem] md:rounded-3xl p-5 md:p-10 border border-slate-200 hover:shadow-xl transition-all duration-300">
      <div className="flex flex-col md:flex-row gap-6 md:gap-10 items-center md:items-start">
        <div className="w-1/2 md:w-1/3 shrink-0 flex justify-center">
          <div className="relative w-full max-w-[230px] md:max-w-[260px] rounded-xl md:rounded-2xl overflow-hidden shadow-lg bg-white border border-slate-200">
            <img
              src={displayAgenda.image_url || "/literasi-brebesan.webp"}
              alt={displayAgenda.title}
              className="w-full h-auto max-h-[210px] md:max-h-[600px] object-cover md:object-cover bg-slate-50 transition-all duration-700"
            />
          </div>
        </div>

        <div className="w-full md:w-2/3 space-y-4 md:space-y-6 min-w-0">
          <h3 className="text-lg md:text-2xl lg:text-3xl font-black text-slate-900 leading-tight tracking-tight break-words">
            {displayAgenda.title}
          </h3>
          <p className="text-xs md:text-sm lg:text-base text-slate-600 leading-relaxed break-words line-clamp-3 md:line-clamp-none">
            {displayAgenda.description}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
            <div className="flex items-center gap-3 md:gap-4 p-3 md:p-4 bg-white rounded-xl md:rounded-2xl border border-slate-200 shadow-sm min-w-0">
              <div className="w-10 h-10 md:w-12 md:h-12 bg-blue-600 rounded-lg md:rounded-xl flex items-center justify-center text-white shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 md:w-6 md:h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] md:text-xs font-black text-slate-500 uppercase tracking-widest mb-0.5 md:mb-1 truncate">Waktu</p>
                <p className="text-xs md:text-sm font-bold text-slate-900 leading-none truncate">{formatDate(displayAgenda.event_date)}</p>
                <p className="text-xs md:text-sm font-medium text-slate-500 mt-1 truncate">{displayAgenda.event_time} WIB</p>
              </div>
            </div>
            <div className="flex items-center gap-3 md:gap-4 p-3 md:p-4 bg-white rounded-xl md:rounded-2xl border border-slate-200 shadow-sm min-w-0">
              <div className="w-10 h-10 md:w-12 md:h-12 bg-slate-900 rounded-lg md:rounded-xl flex items-center justify-center text-white shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 md:w-6 md:h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] md:text-xs font-black text-slate-500 uppercase tracking-widest mb-0.5 md:mb-1 truncate">Lokasi</p>
                <p className="text-xs md:text-sm font-bold text-slate-900 leading-tight break-words line-clamp-2" title={displayAgenda.location}>{displayAgenda.location}</p>
              </div>
            </div>
          </div>
          <div className="pt-3 md:pt-4">
            <a href={displayAgenda.wa_link} target="_blank" className="inline-flex items-center justify-center gap-2 px-6 py-3.5 md:px-8 md:py-4 bg-blue-600 text-white font-black rounded-xl md:rounded-2xl hover:bg-blue-700 transition-all shadow-lg uppercase tracking-widest text-[11px] md:text-sm w-full sm:w-auto">
              Ikut Kegiatan
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 md:w-5 md:h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
