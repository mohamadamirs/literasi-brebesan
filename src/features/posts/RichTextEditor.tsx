import { useState, useEffect, useRef } from 'preact/hooks';

interface Props {
  name: string;
  value?: string;
  placeholder?: string;
}

declare global {
  interface Window {
    Quill: any;
  }
}

export default function RichTextEditor({ name, value = "", placeholder = "Tulis ceritamu di sini..." }: Props) {
  const [activeTab, setActiveTab] = useState<'write' | 'preview'>('write');
  const [content, setContent] = useState(value);
  const [isUploading, setIsUploading] = useState(false);
  const quillRef = useRef<HTMLDivElement>(null);
  const quillInstance = useRef<any>(null);

  const compressImage = (file: File): Promise<File> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 1200; // Standar optimal untuk Web & WA
          const MAX_HEIGHT = 1200;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);

          canvas.toBlob((blob) => {
            if (blob) {
              const compressedFile = new File([blob], file.name.replace(/\.[^/.]+$/, "") + ".jpg", {
                type: 'image/jpeg',
                lastModified: Date.now(),
              });
              resolve(compressedFile);
            } else {
              resolve(file); // Fallback ke file asli jika gagal
            }
          }, 'image/jpeg', 0.8); // Kualitas 80%
        };
      };
    });
  };

  const imageHandler = () => {
    const input = document.createElement('input');
    input.setAttribute('type', 'file');
    input.setAttribute('accept', 'image/*');
    input.click();

    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;

      setIsUploading(true);
      
      // Kompres dulu sebelum dikirim
      const compressedFile = await compressImage(file);
      
      const formData = new FormData();
      formData.append('image', compressedFile);

      try {
        const res = await fetch('/api/upload-image', {
          method: 'POST',
          body: formData,
        });

        if (!res.ok) throw new Error('Upload failed');
        
        const data = await res.json();
        const range = quillInstance.current.getSelection();
        quillInstance.current.insertEmbed(range.index, 'image', data.url);
      } catch (err) {
        console.error('Image upload error:', err);
        alert('Gagal mengunggah gambar. Pastikan ukuran tidak terlalu besar.');
      } finally {
        setIsUploading(false);
      }
    };
  };

  useEffect(() => {
    // Tunggu sampai Quill tersedia secara global (dimuat lewat script tag di Astro)
    const initQuill = () => {
      if (!window.Quill || !quillRef.current || quillInstance.current) return;

      const quill = new window.Quill(quillRef.current, {
        theme: 'snow',
        placeholder: placeholder,
        modules: {
          toolbar: {
            container: [
              [{ 'header': [1, 2, 3, false] }],
              ['bold', 'italic', 'underline', 'strike'],
              ['blockquote', 'code-block'],
              [{ 'list': 'ordered'}, { 'list': 'bullet' }],
              ['link', 'image'],
              ['clean']
            ],
            handlers: {
              image: imageHandler
            }
          }
        }
      });

      if (value) {
        quill.root.innerHTML = value;
      }

      quill.on('text-change', () => {
        setContent(quill.root.innerHTML);
      });

      quillInstance.current = quill;
    };

    // Coba inisialisasi
    if (window.Quill) {
      initQuill();
    } else {
      const interval = setInterval(() => {
        if (window.Quill) {
          initQuill();
          clearInterval(interval);
        }
      }, 100);
    }
  }, []);

  return (
    <div className="rich-text-container space-y-0">
      {/* Unified Sticky Control Header - Top Part (Tabs) */}
      <div className="sticky top-[68px] md:top-[80px] z-[45] -mx-1 px-1">
        <div className="bg-blue-50 backdrop-blur-md border border-blue-100/50 border-b-0 rounded-t-2xl md:rounded-t-[2rem] p-2 md:p-3 shadow-[0_-10px_25px_-5px_rgba(0,0,0,0.05)]">
          {/* Tabs Header */}
          <div className="flex justify-center md:justify-start">
            <div className="flex p-1 bg-white/60 rounded-xl w-fit border border-blue-100/20 mx-auto md:mx-0">
              <button
                type="button"
                onClick={() => setActiveTab('write')}
                className={`px-6 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${
                  activeTab === 'write' 
                    ? 'bg-blue-600 text-white shadow-md' 
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                Ketik
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('preview')}
                className={`px-6 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${
                  activeTab === 'preview' 
                    ? 'bg-blue-600 text-white shadow-md' 
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                Preview
              </button>
            </div>
          </div>
          
          {/* Quill Toolbar will be 'pushed' into this visual space via CSS top adjustment if needed, 
              or we can let it stack naturally. For better unity, we keep the background here. */}
        </div>
      </div>

      {/* Editor / Preview Area */}
      <div className="bg-white border border-slate-200 rounded-[2rem] min-h-[400px]">
        {/* Mode Ketik (Quill) - Kita gunakan hidden agar instance Quill tidak hancur saat pindah tab */}
        <div className={activeTab === 'write' ? 'relative block' : 'hidden'}>
          {isUploading && (
            <div className="absolute inset-0 z-50 bg-white/60 backdrop-blur-[2px] flex flex-col items-center justify-center animate-in fade-in duration-300">
               <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
               <p className="text-[10px] font-black uppercase tracking-widest text-blue-600 animate-pulse">Sedang Mengunggah Gambar...</p>
            </div>
          )}
          <div ref={quillRef} className="quill-editor-inner"></div>
        </div>

        {/* Mode Preview (Prose) */}
        {activeTab === 'preview' && (
          <div className="p-8 md:p-12 animate-in fade-in duration-300 rounded-[2rem]">
            <article 
              className="prose prose-slate prose-sm md:prose-base max-w-none 
                         prose-headings:font-black prose-headings:tracking-tight 
                         prose-p:leading-relaxed prose-p:text-slate-600 
                         prose-img:rounded-3xl prose-img:shadow-xl
                         prose-blockquote:border-l-4 prose-blockquote:border-blue-600 
                         prose-blockquote:bg-blue-50/50 prose-blockquote:p-8 
                         prose-blockquote:rounded-r-3xl prose-blockquote:italic"
              dangerouslySetInnerHTML={{ __html: content }}
            />
          </div>
        )}
      </div>

      {/* Input tersembunyi untuk form submission */}
      <input type="hidden" name={name} value={content === '<p><br></p>' ? '' : content} />
    </div>
  );
}
