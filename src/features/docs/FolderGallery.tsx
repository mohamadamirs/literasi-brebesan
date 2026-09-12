import { useState, useEffect } from 'preact/hooks';

interface DriveItem {
  id: string;
  name: string;
}

interface FolderGalleryProps {
  yearId?: string | null;
  monthId?: string | null;
  activityId?: string | null;
}

export default function FolderGallery({ yearId, monthId, activityId }: FolderGalleryProps) {
  const [data, setData] = useState<DriveItem[]>([]);
  const [view, setView] = useState('');
  const [baseUrl, setBaseUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    async function fetchNavigation() {
      setLoading(true);
      setError(false);
      try {
        const params = new URLSearchParams();
        if (yearId) params.append('yearId', yearId);
        if (monthId) params.append('monthId', monthId);
        if (activityId) params.append('activityId', activityId);

        const res = await fetch(`/api/drive-navigation?${params.toString()}`);
        if (!res.ok) throw new Error('Gagal memuat navigasi');
        
        const result = await res.json();
        setData(result.data);
        setView(result.view);
        setBaseUrl(result.baseUrl);
      } catch (err) {
        console.error(err);
        setError(true);
      } finally {
        setLoading(false);
      }
    }

    fetchNavigation();
  }, [yearId, monthId, activityId]);

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 p-5 md:p-6 bg-white border border-slate-100 rounded-2xl md:rounded-[2rem] animate-pulse shadow-sm">
            <div className="w-12 h-12 bg-slate-100 rounded-xl md:rounded-2xl shrink-0" />
            <div className="flex-1 space-y-3">
              <div className="h-4 bg-slate-100 rounded-full w-3/4" />
              <div className="h-3 bg-slate-50 rounded-full w-1/2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-20 text-center bg-rose-50 rounded-[2rem] md:rounded-[3rem] border border-rose-100 px-6">
        <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-sm">
           <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
        </div>
        <p className="text-rose-900 font-black uppercase tracking-widest text-xs mb-6">Gagal memuat arsip</p>
        <button 
          onClick={() => window.location.reload()} 
          className="px-8 py-3 bg-rose-600 text-white text-[11px] font-black uppercase tracking-widest rounded-full hover:bg-slate-900 transition-all shadow-lg shadow-rose-200"
        >
          Coba Lagi
        </button>
      </div>
    );
  }

  if (view === 'files') return null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
      {data.map((item) => (
        <a 
          key={item.id}
          href={`${baseUrl}${item.id}`} 
          className="flex items-center gap-5 p-5 md:p-6 bg-white border border-slate-100 rounded-2xl md:rounded-[2rem] hover:border-blue-600 hover:shadow-2xl hover:shadow-blue-900/5 hover:-translate-y-1 transition-all group shadow-sm"
        >
          <div className="w-12 h-12 md:w-14 md:h-14 bg-slate-50 rounded-xl md:rounded-2xl flex items-center justify-center text-slate-300 group-hover:bg-blue-600 group-hover:text-white transition-all shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 md:w-8 md:h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
            </svg>
          </div>
          <div className="flex flex-col overflow-hidden text-left min-w-0">
            <span className="text-sm md:text-base font-black text-slate-900 truncate uppercase tracking-tight leading-tight mb-1">
              {item.name}
            </span>
            <span className="text-[10px] md:text-[11px] text-slate-500 font-bold uppercase tracking-widest">
              {view === 'years' ? 'Arsip Tahunan' : view === 'months' ? 'Koleksi Bulan' : 'Lihat Dokumentasi'}
            </span>
          </div>
          <div className="ml-auto text-slate-200 group-hover:text-blue-600 transition-colors">
             <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" /></svg>
          </div>
        </a>
      ))}
      {data.length === 0 && (
        <div className="col-span-full py-20 text-center bg-white border-2 border-dashed border-slate-100 rounded-[2.5rem] px-6">
          <p className="text-slate-500 font-black uppercase tracking-[0.3em] text-xs">Arsip Kosong</p>
        </div>
      )}
    </div>
  );
}
