import { useState, useEffect, useRef } from 'preact/hooks';

export default function ScrollToTop() {
  const [isVisible, setIsVisible] = useState(false);
  const lastScrollY = useRef(0);

  const handleScroll = () => {
    const currentScrollY = window.pageYOffset;
    const threshold = 400;

    // Logika: Tampilkan hanya jika:
    // 1. Sudah scroll lebih dari threshold
    // 2. Arah scroll adalah KE ATAS (current < last)
    if (currentScrollY > threshold && currentScrollY < lastScrollY.current) {
      setIsVisible(true);
    } else {
      // Sembunyikan jika scroll ke bawah atau masih di area atas
      setIsVisible(false);
    }

    lastScrollY.current = currentScrollY;
  };

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  };

  useEffect(() => {
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <button
      onClick={scrollToTop}
      aria-label="Scroll to top"
      class={`fixed bottom-8 right-8 z-50 p-4 rounded-2xl bg-slate-900 text-white shadow-2xl shadow-blue-900/20 border border-white/10 transition-all duration-500 ease-out active:scale-90 group ${
        isVisible 
          ? 'opacity-100 translate-y-0 scale-100' 
          : 'opacity-0 translate-y-12 scale-90 pointer-events-none'
      }`}
    >
      <svg 
        xmlns="http://www.w3.org/2000/svg" 
        class="w-6 h-6 transform group-hover:-translate-y-1 transition-transform" 
        fill="none" 
        stroke="currentColor" 
        stroke-width="3" 
        viewBox="0 0 24 24"
      >
        <path stroke-linecap="round" stroke-linejoin="round" d="M5 15l7-7 7 7" />
      </svg>
      
      {/* Tooltip or Label */}
      <span class={`absolute right-full mr-4 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest rounded-lg transition-opacity whitespace-nowrap pointer-events-none ${isVisible ? 'group-hover:opacity-100' : 'opacity-0'}`}>
        Ke Atas
      </span>
    </button>
  );
}
