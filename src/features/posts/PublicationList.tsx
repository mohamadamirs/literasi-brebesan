import { useState, useEffect, useRef } from 'preact/hooks';
import { formatDate, truncateTitle, truncateText, extractFirstImage } from "@/shared/utils/utils";

interface Post {
  title: string;
  content: string;
  slug: string;
  updated_at: string;
  user_id: string;
  author_name: string | null;
  author_instagram: string | null;
  author_avatar: string | null;
  category_name: string | null;
}

interface Props {
  initialPosts: Post[];
  categoryId: string | null;
}

export default function PublicationList({ initialPosts, categoryId }: Props) {
  const [posts, setPosts] = useState<Post[]>(initialPosts);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(initialPosts.length === 9);
  const [search, setSearch] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isAnimatingHighlight, setIsAnimatingHighlight] = useState(false);
  
  const searchTimeout = useRef<any>(null);

  // Fungsi fetch utama
  const fetchPosts = async (currentPosts: Post[], isNewSearch = false) => {
    setLoading(true);
    const offset = isNewSearch ? 0 : currentPosts.length;
    const url = `/api/posts?limit=9&offset=${offset}${categoryId ? `&category=${categoryId}` : ''}${search ? `&search=${encodeURIComponent(search)}` : ''}`;
    
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to fetch');
      const newPosts = await res.json();
      
      if (isNewSearch) {
        setPosts(newPosts);
        setHasMore(newPosts.length === 9);
        // Trigger animasi highlight jika ini pencarian baru dan ada hasil
        if (search && newPosts.length > 0) {
          setIsAnimatingHighlight(true);
          setTimeout(() => setIsAnimatingHighlight(false), 1000); // 1 detik animasi cepat
        }
      } else {
        setPosts([...currentPosts, ...newPosts]);
        setHasMore(newPosts.length === 9);
      }
    } catch (err) {
      console.error("Error fetching posts:", err);
    } finally {
      setLoading(false);
      setIsSearching(false);
    }
  };

  // Debounced Search Handler
  useEffect(() => {
    if (search === '' && posts.length === initialPosts.length && !isSearching) return;

    setIsSearching(true);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    
    searchTimeout.current = setTimeout(() => {
      fetchPosts([], true);
    }, 600); // 600ms debounce

    return () => clearTimeout(searchTimeout.current);
  }, [search]);

  const loadMore = () => fetchPosts(posts);

  return (
    <div className="space-y-12">
      {/* Search Bar Area - Opsi B: Glassmorphism Pill */}
      <div class="max-w-2xl mx-auto mb-16 px-4">
        <div class="relative">
          {/* Main Input Pill */}
          <div class={`relative flex items-center transition-all duration-500 rounded-full border ${isSearching || search ? 'border-blue-300 ring-4 ring-blue-50' : 'border-slate-200'} bg-white/70 backdrop-blur-xl shadow-lg shadow-blue-900/5`}>
            
            {/* Left Icon / Spinner */}
            <div class="pl-6 flex items-center justify-center">
              {isSearching ? (
                <div class="w-5 h-5 border-[3px] border-blue-100 border-t-blue-600 rounded-full animate-spin"></div>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" class={`h-5 w-5 ${search ? 'text-blue-600' : 'text-slate-400'} transition-colors duration-300`} fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              )}
            </div>

            <input 
              type="text" 
              placeholder="Cari keajaiban dalam tulisan..."
              value={search}
              onInput={(e) => setSearch((e.target as HTMLInputElement).value)}
              class="w-full pl-4 pr-12 py-5 bg-transparent outline-none font-bold text-slate-800 placeholder:text-slate-400 text-sm md:text-base"
            />

            {/* Right: Clear Button & Result Count */}
            <div class="absolute right-4 flex items-center gap-3">
               {search && !isSearching && (
                 <span class="hidden md:inline-flex px-3 py-1.5 rounded-full bg-blue-600 text-white text-[9px] font-black uppercase tracking-wider shadow-md shadow-blue-200">
                   {posts.length} Hasil
                 </span>
               )}
               {search && (
                 <button 
                  onClick={() => setSearch('')}
                  class="p-2 hover:bg-slate-100 rounded-full transition-all text-slate-400 hover:text-red-500 active:scale-90"
                  aria-label="Hapus pencarian"
                 >
                   <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                 </button>
               )}
            </div>
          </div>

          {/* Bottom Indicators */}
          <div class="flex justify-center mt-4">
             {search && !isSearching && (
               <div class="animate-pulse">
                  <p class="text-[9px] md:text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">
                    Menelusuri: <span class="text-blue-600">"{search}"</span>
                  </p>
               </div>
             )}
          </div>
        </div>
      </div>

      {posts.length === 0 && !loading ? (
        <div class="py-24 md:py-32 text-center border-2 border-dashed border-slate-200 rounded-[2.5rem] md:rounded-[3rem] bg-white/50 px-6">
          <div class="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
             <svg xmlns="http://www.w3.org/2000/svg" class="w-8 h-8 text-slate-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </div>
          <h2 class="text-lg md:text-xl font-black text-slate-900 tracking-tight mb-2">Tidak ditemukan</h2>
          <p class="text-slate-500 text-sm md:text-base font-medium max-w-xs mx-auto mb-8">Maaf, kami tidak dapat menemukan tulisan yang Anda cari.</p>
          <button onClick={() => setSearch('')} class="text-blue-600 font-black uppercase tracking-widest text-[10px] md:text-xs">Hapus Pencarian</button>
        </div>
      ) : (
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 lg:gap-8">
          {posts.map((post, index) => {
            const firstImage = extractFirstImage(post.content);
            const isTopMatch = search && index === 0 && !loading;
            
            return (
              <article 
                class={`relative bg-white rounded-2xl md:rounded-[2rem] border transition-all duration-500 flex flex-col group overflow-hidden
                  ${isTopMatch 
                    ? (isAnimatingHighlight ? 'rotating-border-active border-transparent shadow-[0_0_20px_rgba(59,130,246,0.3)]' : 'solid-border-active border-transparent shadow-[0_0_15px_rgba(59,130,246,0.2)]')
                    : 'border-slate-100 shadow-sm hover:shadow-2xl hover:shadow-blue-900/5 hover:-translate-y-1.5'
                  }`}
              >
                <div class="p-5 md:p-8 flex flex-col h-full">
                  
                  <div class="flex items-center justify-between mb-4">
                     <span class="px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-600 text-[9px] md:text-[10px] font-black uppercase tracking-wider border border-blue-100">
                        {post.category_name || "Umum"}
                     </span>
                     <span class="text-[9px] md:text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                        {formatDate(post.updated_at)}
                     </span>
                  </div>

                  <h2 class="text-base md:text-xl font-black text-slate-900 mb-3 leading-tight group-hover:text-blue-600 transition-colors line-clamp-2 break-words w-full" title={post.title}>
                    <a href={`/publikasi/${post.slug}`} class="before:absolute before:inset-0 outline-none">
                      {truncateTitle(post.title, 55)}
                    </a>
                  </h2>

                  {firstImage && (
                    <div class="my-4 relative aspect-[16/9] overflow-hidden rounded-xl md:rounded-2xl border border-slate-50 shadow-sm">
                      <img 
                        src={firstImage} 
                        alt={post.title}
                        width="600"
                        height="337"
                        class="w-full h-full object-cover"
                        loading="lazy"
                      />
                    </div>
                  )}

                  <p class="text-slate-500 text-xs md:text-sm mb-6 flex-grow line-clamp-3 leading-relaxed font-medium break-words">
                    {truncateText(post.content, 110)}
                  </p>

                  <div class="mt-auto pt-5 border-t border-slate-50 flex items-center justify-between relative z-20">
                    <div class="flex items-center gap-3 min-w-0">
                      <a href={`/p/${post.user_id}`} class="w-8 h-8 md:w-10 md:h-10 rounded-full bg-blue-100 border-2 border-white shadow-sm flex items-center justify-center text-blue-600 font-black text-[10px] md:text-xs uppercase overflow-hidden shrink-0 hover:scale-110 transition-transform">
                        {post.author_avatar ? (
                          <img src={post.author_avatar} alt={post.author_name || 'Author'} class="w-full h-full object-cover" />
                        ) : (
                          post.author_name?.charAt(0) || 'U'
                        )}
                      </a>
                      <div class="flex flex-col min-w-0">
                        <a href={`/p/${post.user_id}`} class="text-[10px] md:text-[11px] font-black text-slate-900 tracking-wider truncate hover:text-blue-600 transition-colors">{post.author_name || "Anonim"}</a>
                        {post.author_instagram && (
                          <a 
                            href={`https://instagram.com/${post.author_instagram.replace('@', '')}`} 
                            target="_blank" 
                            class="text-[9px] md:text-[10px] font-bold text-[#e1306c] tracking-widest mt-0.5 hover:opacity-70 transition-opacity flex items-center gap-1"
                          >
                            <svg width="20px" height="20px" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg" class="w-2.5 h-2.5 md:w-3 md:h-3" fill="currentColor">
                              <rect x="0" fill="none" width="20" height="20"/>
                              <g>
                                <path d="M12.7 10c0-1.5-1.2-2.7-2.7-2.7S7.3 8.5 7.3 10s1.2 2.7 2.7 2.7c1.5 0 2.7-1.2 2.7-2.7zm1.4 0c0 2.3-1.8 4.1-4.1 4.1S5.9 12.3 5.9 10 7.7 5.9 10 5.9s4.1 1.8 4.1 4.1zm1.1-4.3c0 .6-.4 1-1 1s-1-.4-1-1 .4-1 1-1 1 .5 1 1zM10 3.4c-1.2 0-3.7-.1-4.7.3-.7.3-1.3.9-1.5 1.6-.4 1-.3 3.5-.3 4.7s-.1 3.7.3 4.7c.2.7.8 1.3 1.5 1.5 1 .4 3.6.3 4.7.3s3.7.1 4.7-.3c.7-.3 1.2-.8 1.5-1.5.4-1.1.3-3.6.3-4.7s.1-3.7-.3-4.7c-.2-.7-.8-1.3-1.5-1.5-1-.5-3.5-.4-4.7-.4zm8 6.6v3.3c0 1.2-.4 2.4-1.3 3.4-.9.9-2.1 1.3-3.4 1.3H6.7c-1.2 0-2.4-.4-3.4-1.3-.8-.9-1.3-2.1-1.3-3.4V10 6.7c0-1.3.5-2.5 1.3-3.4C4.3 2.5 5.5 2 6.7 2h6.6c1.2 0 2.4.4 3.4 1.3.8.9 1.3 2.1 1.3 3.4V10z"/>
                              </g>
                            </svg>
                            @{post.author_instagram.replace('@', '')}
                          </a>
                        )}
                      </div>
                    </div>
                    <div class="w-8 h-8 md:w-10 md:h-10 rounded-full bg-slate-50 text-slate-500 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-all shadow-sm border border-slate-100 group-hover:border-blue-600">
                      <svg class="w-3.5 h-3.5 md:w-4 md:h-4 transform group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" stroke-width="3" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M5 12h14M12 5l7 7-7 7"></path></svg>
                    </div>
                  </div>

                </div>
              </article>
            );
          })}
        </div>
      )}

      {hasMore && (
        <div class="flex justify-center mt-12">
          <button 
            onClick={loadMore}
            disabled={loading}
            class="group flex items-center justify-center gap-3 bg-white border border-slate-200 text-slate-900 px-8 py-4 rounded-2xl font-black text-xs md:text-sm uppercase tracking-widest shadow-xl shadow-slate-200/50 hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-all active:scale-95 disabled:opacity-50"
          >
            {loading ? (
              <span class="w-5 h-5 border-2 border-slate-300 border-t-slate-900 rounded-full animate-spin group-hover:border-white/30 group-hover:border-t-white"></span>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>
            )}
            {loading ? "Memuat..." : "Muat Lebih Banyak"}
          </button>
        </div>
      )}
    </div>
  );
}
