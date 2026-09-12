import { useState, useEffect, useRef } from 'preact/hooks';

interface DriveItem {
  id: string;
  name: string;
  webContentLink?: string;
}

interface FileGalleryProps {
  activityId: string;
}

export default function FileGallery({ activityId }: FileGalleryProps) {
  const [files, setFiles] = useState<DriveItem[]>([]);
  const [pageToken, setPageToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchingMore, setFetchingMore] = useState(false);
  const [selectedImage, setSelectedImage] = useState<DriveItem | null>(null);
  const [error, setError] = useState(false);
  
  const sensorRef = useRef<HTMLDivElement>(null);

  // Fetch pertama kali
  useEffect(() => {
    fetchFiles();
  }, [activityId]);

  // Observer untuk Infinite Scroll
  useEffect(() => {
    if (!pageToken) return;

    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && !fetchingMore) {
        fetchFiles(pageToken);
      }
    }, { rootMargin: '400px' });

    if (sensorRef.current) observer.observe(sensorRef.current);
    
    return () => observer.disconnect();
  }, [pageToken, fetchingMore]);

  async function fetchFiles(token: string | null = null) {
    if (token) setFetchingMore(true);
    else {
      setLoading(true);
      setError(false);
    }

    try {
      const res = await fetch(`/api/drive-files?folderId=${activityId}&pageToken=${token || ''}&limit=12`);
      if (!res.ok) throw new Error('API Error');
      const data = await res.json();
      
      if (token) {
        setFiles(prev => [...prev, ...data.files]);
      } else {
        setFiles(data.files);
      }
      setPageToken(data.nextPageToken);
    } catch (err) {
      console.error("Gagal memuat foto:", err);
      if (!token) setError(true);
    } finally {
      setLoading(false);
      setFetchingMore(false);
    }
  }

  if (error) {
    return (
      <div className="py-20 text-center bg-rose-50 rounded-[2rem] border border-rose-100 px-6">
        <p className="text-rose-600 font-black uppercase tracking-widest text-xs mb-4">Gagal memuat foto</p>
        <button onClick={() => fetchFiles()} className="px-8 py-3 bg-rose-600 text-white text-[11px] font-black uppercase tracking-widest rounded-full shadow-lg">Coba Lagi</button>
      </div>
    );
  }

  return (
    <div className="space-y-12">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
        {loading ? (
          Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="aspect-square bg-slate-100 rounded-2xl md:rounded-[2rem] animate-pulse" />
          ))
        ) : (
          <>
            {files.map((file) => (
              <div 
                key={file.id} 
                className="group relative aspect-square bg-white rounded-2xl md:rounded-[2rem] overflow-hidden border border-slate-100 cursor-pointer shadow-sm hover:shadow-2xl hover:shadow-blue-900/10 transition-all duration-500"
                onClick={() => setSelectedImage(file)}
              >
                <img 
                  src={`/api/drive-image/${file.id}?sz=600`} 
                  alt={file.name} 
                  loading="lazy"
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" 
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent flex flex-col justify-end p-4 md:p-6 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <p className="text-[10px] md:text-xs text-white font-black uppercase tracking-widest truncate">{file.name}</p>
                </div>
              </div>
            ))}
            {files.length === 0 && (
              <div className="col-span-full py-20 text-center bg-white border-2 border-dashed border-slate-100 rounded-[2.5rem]">
                <p className="text-slate-500 font-black uppercase tracking-[0.3em] text-xs">Folder Media Kosong</p>
              </div>
            )}
          </>
        )}
      </div>

      {pageToken && (
        <div ref={sensorRef} className="py-10 flex justify-center items-center">
          <div className="animate-spin rounded-full h-8 w-8 border-4 border-slate-100 border-t-blue-600"></div>
        </div>
      )}

      {/* MODAL VIEW */}
      {selectedImage && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/95 backdrop-blur-md p-4 md:p-10"
          onClick={() => setSelectedImage(null)}
        >
          <button className="absolute top-6 right-6 text-white/50 hover:text-white transition-colors p-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
          
          <div className="relative max-w-5xl w-full flex flex-col items-center gap-6" onClick={e => e.stopPropagation()}>
            <div className="relative w-full aspect-auto bg-white/5 rounded-2xl md:rounded-[3rem] overflow-hidden shadow-2xl border border-white/10">
              <img 
                src={`/api/drive-image/${selectedImage.id}?sz=1600`} 
                className="w-full h-auto max-h-[75vh] object-contain mx-auto animate-in zoom-in-95 duration-500" 
                alt={selectedImage.name}
              />
            </div>
            
            <div className="flex flex-col items-center gap-4 text-center">
              <p className="text-white text-sm md:text-base font-bold tracking-tight">{selectedImage.name}</p>
              <div className="flex gap-3">
                <a 
                  href={selectedImage.webContentLink} 
                  target="_blank" 
                  className="px-8 py-4 bg-white text-slate-900 text-[11px] font-black uppercase tracking-widest rounded-2xl hover:bg-blue-600 hover:text-white transition-all shadow-xl active:scale-95"
                >
                  Unduh Original
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
