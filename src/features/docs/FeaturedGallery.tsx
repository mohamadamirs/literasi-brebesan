import { useState, useEffect } from 'preact/hooks';

interface DriveFile {
  id: string;
  name: string;
}

export default function FeaturedGallery() {
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchGallery() {
      try {
        const res = await fetch(`/api/drive-latest?limit=4`);
        if (!res.ok) throw new Error('Gagal memuat');
        const data = await res.json();
        setFiles(data);
      } catch (err) {
        console.error("Gagal memuat galeri home:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchGallery();
  }, []);

  const isMosaic = files.length >= 4;

  return (
    <div className="mb-8 grid grid-cols-2 gap-3 text-left md:mb-12 md:auto-rows-[190px] md:grid-cols-4 md:grid-rows-2 md:gap-4">
      {loading ? (
        Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className={`relative aspect-square animate-pulse overflow-hidden rounded-2xl border border-white/20 bg-white/10 md:aspect-auto md:h-full ${i === 0 ? 'md:col-span-2 md:row-span-2' : ''}`}
          >
            <div className="h-full w-full bg-white/5"></div>
          </div>
        ))
      ) : (
        files.map((file, index) => (
          <a
            key={file.id}
            href="/dokumentasi"
            className={`group relative aspect-square overflow-hidden rounded-2xl border border-white/15 bg-white/10 shadow-lg md:aspect-auto md:h-full ${
              index === 0 && isMosaic ? 'md:col-span-2 md:row-span-2' : ''
            }`}
          >
            <img
              src={`/api/drive-image/${file.id}?sz=800`}
              alt={file.name}
              className="h-full w-full object-cover opacity-85 transition-all duration-700 group-hover:scale-[1.04] group-hover:opacity-100"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/10 to-transparent opacity-80 transition-opacity group-hover:opacity-100" aria-hidden="true"></div>
            <div className="absolute inset-x-3 bottom-3 md:inset-x-4 md:bottom-4">
              <p className="truncate text-[10px] font-black uppercase tracking-widest text-white/85">{file.name}</p>
            </div>
            <span className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white opacity-0 backdrop-blur transition-all group-hover:opacity-100 md:right-4 md:top-4" aria-hidden="true">
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M7 17L17 7M17 7H8M17 7v9" /></svg>
            </span>
          </a>
        ))
      )}
    </div>
  );
}
