import { useState, useRef } from 'preact/hooks';
import { actions } from "astro:actions";
import AdminModal from "@/features/admin/AdminModal";

interface Props {
  post: {
    id: string;
    title: string;
    created_at: any;
    status: string;
    rejection_reason?: string | null;
  };
}

export default function UserPostCard({ post }: Props) {
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isRejectionModalOpen, setIsRejectionModalOpen] = useState(false);
  const deleteFormRef = useRef<HTMLFormElement>(null);

  const formatDate = (date: any) => {
    return new Date(date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'published':
        return { label: 'Terbit', classes: 'bg-emerald-50 text-emerald-600 border-emerald-100' };
      case 'pending':
        return { label: 'Menunggu', classes: 'bg-amber-50 text-amber-600 border-amber-100' };
      default:
        return { label: 'Draft', classes: 'bg-slate-50 text-slate-500 border-slate-200' };
    }
  };

  const badge = getStatusBadge(post.status);

  const handleConfirmDelete = () => {
    if (deleteFormRef.current) {
      deleteFormRef.current.submit();
    }
    setIsDeleteModalOpen(false);
  };

  return (
    <div class={`bg-white p-4 md:p-6 rounded-xl md:rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-slate-200/50 hover:border-blue-200 transition-all group flex items-center justify-between gap-4 md:gap-6 animate-fade-in-up ${isDeleteModalOpen || isRejectionModalOpen ? 'z-[100] relative' : 'relative z-0'}`}>
      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-2 md:gap-3 mb-1.5 md:mb-2">
           <span class={`px-2 py-0.5 rounded-full text-[8px] md:text-[9px] font-black border ${badge.classes}`}>
              {badge.label}
           </span>
           
           {post.status === 'draft' && post.rejection_reason && (
             <button 
               onClick={() => setIsRejectionModalOpen(true)}
               class="flex items-center gap-1.5 px-2 py-0.5 bg-amber-500 text-white rounded-full text-[8px] md:text-[9px] font-black animate-pulse hover:bg-slate-900 transition-colors shadow-lg shadow-amber-200"
             >
               <svg xmlns="http://www.w3.org/2000/svg" class="w-2.5 h-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="4"><path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
               REVISI
             </button>
           )}

           <span class="text-[9px] md:text-[10px] text-slate-500 font-bold">
              {formatDate(post.created_at)}
           </span>
        </div>
        <a href={post.status === 'published' ? `/publikasi/${post.slug}` : `/user/posts/edit/${post.id}`} target={post.status === 'published' ? "_blank" : "_self"} class="block group/title">
          <h4 class="font-black text-sm md:text-lg text-slate-900 truncate group-hover:text-blue-600 transition-colors tracking-tight flex items-center gap-2">
              {post.title}
              {post.status === 'published' ? (
                <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5 opacity-0 group-hover/title:opacity-100 transition-all text-blue-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5 opacity-0 group-hover/title:opacity-100 transition-all text-blue-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              )}
          </h4>
        </a>
      </div>

      <div class="flex items-center gap-1.5 md:gap-2 shrink-0">
        <a href={`/user/posts/edit/${post.id}`} class="w-9 h-9 md:w-12 md:h-12 flex items-center justify-center text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-xl md:rounded-2xl transition-all border border-transparent hover:border-blue-100" title="Edit Tulisan">
          <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 md:w-5 md:h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
        </a>

        <button 
          onClick={() => setIsDeleteModalOpen(true)}
          class="w-9 h-9 md:w-12 md:h-12 flex items-center justify-center text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-xl md:rounded-2xl transition-all border border-transparent hover:border-rose-100 cursor-pointer" 
          title="Hapus Tulisan"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 md:w-5 md:h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
        </button>

        {/* Hidden Delete Form */}
        <form ref={deleteFormRef} action={actions.deletePost} method="POST" class="hidden">
          <input type="hidden" name="id" value={post.id} />
        </form>
      </div>

      {/* Delete Confirmation Modal */}
      <AdminModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleConfirmDelete}
        title="Hapus Tulisan?"
        description={`Apakah Anda yakin ingin menghapus "${post.title}"? Tindakan ini tidak dapat dibatalkan.`}
        confirmText="Ya, Hapus Sekarang"
        variant="danger"
      />

      {/* Rejection Reason Modal */}
      <AdminModal
        isOpen={isRejectionModalOpen}
        onClose={() => setIsRejectionModalOpen(false)}
        onConfirm={() => setIsRejectionModalOpen(false)}
        title="Catatan Revisi Admin"
        description={post.rejection_reason || ""}
        confirmText="Saya Mengerti"
        cancelText=""
        variant="warning"
      />
    </div>
  );
}
