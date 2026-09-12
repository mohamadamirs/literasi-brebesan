import { useState, useRef } from 'preact/hooks';
import { actions } from "astro:actions";
import AdminModal from "@/features/admin/AdminModal";

interface Props {
  post: {
    id: string;
    title: string;
    author: string;
    category: string | null;
    status: string;
    created_at: any;
    slug: string;
    rejection_reason?: string | null;
  };
}

export default function ArticleCard({ post }: Props) {
  const [modalType, setModalType] = useState<'reject' | 'delete' | 'reason' | null>(null);
  const rejectFormRef = useRef<HTMLFormElement>(null);
  const deleteFormRef = useRef<HTMLFormElement>(null);

  const formatDate = (date: any) => {
    return new Date(date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const handleConfirm = (data?: string) => {
    if (modalType === 'reject' && rejectFormRef.current) {
      const reasonInput = rejectFormRef.current.elements.namedItem('reason') as HTMLInputElement;
      if (reasonInput && data) {
        reasonInput.value = data;
        rejectFormRef.current.submit();
      }
    } else if (modalType === 'delete' && deleteFormRef.current) {
      deleteFormRef.current.submit();
    }
    setModalType(null);
  };

  return (
    <div class={`bg-white p-4 md:p-6 rounded-[1.5rem] border border-slate-200 shadow-sm hover:shadow-md transition-all group animate-fade-in-up ${modalType ? 'z-[100] relative' : 'relative z-0'}`}>
      <div class="flex flex-col md:flex-row md:items-center justify-between gap-6">
        {/* Kolom Kiri: Info */}
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2 mb-2">
            <span class="text-[8px] font-black uppercase tracking-wider px-2 py-0.5 bg-slate-100 text-slate-500 rounded border border-slate-200">
              {post.category || 'No Category'}
            </span>
            <span class={`text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded border ${
              post.status === 'published' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 
              post.status === 'pending' ? 'bg-amber-50 text-amber-600 border-amber-100' : 
              'bg-slate-50 text-slate-500'
            }`}>
              {post.status}
            </span>
          </div>
          
          <a href={post.status === 'published' ? `/publikasi/${post.slug}` : `/admin/posts/edit/${post.id}`} target={post.status === 'published' ? "_blank" : "_self"} class="block group/title max-w-full">
            <h3 class="font-bold text-slate-900 mb-1 group-hover/title:text-blue-600 transition-colors line-clamp-2 break-words flex items-start gap-2 pr-4">
              <span class="flex-1">{post.title}</span>
              {post.status === 'published' ? (
                <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5 opacity-0 group-hover/title:opacity-100 transition-all text-blue-400 shrink-0 mt-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5 opacity-0 group-hover/title:opacity-100 transition-all text-blue-400 shrink-0 mt-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              )}
            </h3>
          </a>
          
          <p class="text-[10px] font-bold text-slate-500 uppercase tracking-tight truncate max-w-xs">{post.author} • {formatDate(post.created_at)}</p>
        </div>

        {/* Kolom Kanan: Aksi */}
        <div class="flex flex-wrap md:flex-nowrap items-center gap-2 shrink-0">
          {/* Icon Tanda Seru Jika Ada Alasan Penolakan Sebelumnya */}
          {post.rejection_reason && (
            <button 
              type="button"
              onClick={() => setModalType('reason')}
              class="w-10 h-10 flex items-center justify-center bg-amber-50 text-amber-600 rounded-xl border border-amber-100 hover:bg-amber-100 transition-all animate-pulse"
              title="Lihat Catatan Penolakan"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </button>
          )}

          <a href={`/admin/posts/edit/${post.id}`} class="flex-1 md:flex-none px-4 py-2.5 bg-slate-50 text-slate-700 text-[10px] font-black uppercase tracking-wider rounded-xl hover:bg-slate-200 transition-all text-center">Edit</a>
          
          {post.status === 'pending' && (
            <>
              <form method="POST" action={actions.approvePost} class="flex-1 md:flex-none m-0">
                <input type="hidden" name="id" value={post.id} />
                <button type="submit" class="w-full px-4 py-2.5 bg-blue-600 text-white text-[10px] font-black uppercase tracking-wider rounded-xl hover:bg-blue-700 transition-all shadow-md shadow-blue-100">Publish</button>
              </form>

              <button 
                type="button"
                onClick={() => setModalType('reject')}
                class="flex-1 md:flex-none px-4 py-2.5 bg-amber-50 text-amber-600 border border-amber-100 text-[10px] font-black uppercase tracking-wider rounded-xl hover:bg-amber-100 transition-all"
              >
                Tolak
              </button>

              <form ref={rejectFormRef} method="POST" action={actions.rejectPost} class="hidden">
                <input type="hidden" name="id" value={post.id} />
                <input type="hidden" name="reason" value="" />
              </form>
            </>
          )}

          <button 
            type="button"
            onClick={() => setModalType('delete')}
            class="flex-1 md:flex-none px-4 py-2.5 bg-red-50 text-red-600 text-[10px] font-black uppercase tracking-wider rounded-xl hover:bg-red-100 transition-all"
          >
            Hapus
          </button>

          <form ref={deleteFormRef} method="POST" action={actions.deletePost} class="hidden">
            <input type="hidden" name="id" value={post.id} />
          </form>
        </div>
      </div>

      {/* Modals */}
      <AdminModal
        isOpen={modalType === 'reject'}
        onClose={() => setModalType(null)}
        onConfirm={handleConfirm}
        title="Tolak Tulisan"
        description={`Berikan alasan mengapa tulisan "${post.title}" dikembalikan ke Draft agar penulis dapat memperbaikinya.`}
        confirmText="Ya, Tolak"
        showInput={true}
        inputPlaceholder="Misal: Mohon perbaiki judul agar lebih menarik..."
        variant="warning"
      />

      <AdminModal
        isOpen={modalType === 'delete'}
        onClose={() => setModalType(null)}
        onConfirm={handleConfirm}
        title="Hapus Tulisan"
        description={`Apakah Anda yakin ingin menghapus "${post.title}" secara permanen?`}
        confirmText="Hapus Selamanya"
        variant="danger"
      />

      <AdminModal
        isOpen={modalType === 'reason'}
        onClose={() => setModalType(null)}
        onConfirm={() => setModalType(null)}
        title="Catatan Penolakan"
        description={post.rejection_reason || "Tidak ada catatan."}
        confirmText="Tutup"
        cancelText=""
        variant="warning"
      />
    </div>
  );
}
