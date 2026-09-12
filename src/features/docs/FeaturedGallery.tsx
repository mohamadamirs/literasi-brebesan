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

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-8 md:mb-12 text-left">
      {loading ? (
        // SKELETONS
        Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="relative aspect-square bg-white/10 border border-white/20 rounded-xl md:rounded-2xl overflow-hidden animate-pulse">
            <div className="w-full h-full bg-white/5"></div>
          </div>
        ))
      ) : (
        files.map((file) => (
          <a 
            key={file.id}
            href="/dokumentasi" 
            className="relative aspect-square bg-white/10 border border-white/20 rounded-xl md:rounded-2xl overflow-hidden group shadow-lg"
          >
            <img 
              src={`/api/drive-image/${file.id}?sz=600`}
              alt={file.name}
              className="w-full h-full object-cover transition-all duration-700 opacity-80 group-hover:opacity-100"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-3">
              <p className="text-[10px] font-bold text-white uppercase tracking-widest truncate">{file.name}</p>
            </div>
          </a>
        ))
      )}
    </div>
  );
}
