import { useState, useEffect, useRef } from 'preact/hooks';

interface Props {
  children: any;
}

export default function CategoryScroll({ children }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [showScrollbar, setShowScrollbar] = useState(false);
  const thumbWidth = 30; // Ukuran thumb tetap 30% sesuai permintaan

  const updateScroll = () => {
    if (!scrollRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
    
    const maxScroll = scrollWidth - clientWidth;
    if (maxScroll <= 0) {
      setScrollProgress(0);
      return;
    }
    
    const progress = (scrollLeft / maxScroll) * 100;
    setScrollProgress(progress);
  };

  useEffect(() => {
    const el = scrollRef.current;
    if (el) {
      const checkScroll = () => {
        const needsScroll = el.scrollWidth > el.clientWidth;
        setShowScrollbar(needsScroll);
        if (needsScroll) updateScroll();
      };

      checkScroll();
      el.addEventListener('scroll', updateScroll, { passive: true });
      
      const observer = new ResizeObserver(checkScroll);
      observer.observe(el);
      
      return () => {
        el.removeEventListener('scroll', updateScroll);
        observer.disconnect();
      };
    }
  }, []);

  return (
    <div class="relative w-full mb-8">
      {/* Scrollable Area */}
      <div 
        ref={scrollRef}
        class="flex items-center gap-2 overflow-x-auto pb-6 scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0 scroll-smooth"
      >
        {children}
      </div>

      {/* Custom Scrollbar Progress Bar */}
      {showScrollbar && (
        <div class="flex justify-center mt-2">
          {/* Track: Lebar 90% layar sesuai permintaan */}
          <div class="w-[90%] h-1.5 bg-blue-50 rounded-full overflow-hidden relative border border-blue-100 shadow-inner">
            <div 
              class="absolute top-0 left-0 h-full bg-blue-600 rounded-full transition-transform duration-75 ease-out origin-left"
              style={{ 
                width: `${thumbWidth}%`,
                // Rumus: Progres * (Sisa ruang / Lebar thumb)
                transform: `translateX(${scrollProgress * ((100 - thumbWidth) / thumbWidth)}%)`
              }}
            ></div>
          </div>
        </div>
      )}
    </div>
  );
}
