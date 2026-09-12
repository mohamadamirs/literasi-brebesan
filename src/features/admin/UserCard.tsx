import { useState, useRef } from 'preact/hooks';
import { actions } from "astro:actions";
import AdminModal from "@/features/admin/AdminModal";

interface Props {
  user: {
    id: string;
    full_name: string;
    email: string;
    role: string;
  };
}

export default function UserCard({ user }: Props) {
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const deleteFormRef = useRef<HTMLFormElement>(null);

  const handleConfirmDelete = () => {
    if (deleteFormRef.current) {
      deleteFormRef.current.submit();
    }
    setIsDeleteModalOpen(false);
  };

  return (
    <div class={`bg-white p-4 md:p-6 rounded-[1.5rem] border border-slate-200 shadow-sm hover:shadow-md transition-all animate-fade-in-up ${isDeleteModalOpen ? 'z-[100] relative' : 'relative z-0'}`}>
      <div class="flex flex-col md:flex-row md:items-center justify-between gap-6">
        {/* Kolom Kiri: Info */}
        <div class="flex-1 flex items-center gap-4">
          <div class="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-black text-slate-500 uppercase shrink-0">
            {user.full_name[0]}
          </div>
          <div class="min-w-0">
            <h3 class="font-bold text-slate-900 leading-tight truncate">{user.full_name}</h3>
            <p class="text-[10px] font-bold text-slate-500 uppercase tracking-wider truncate">
              {user.email} • <span class={user.role === 'admin' ? 'text-indigo-600' : 'text-slate-500'}>{user.role}</span>
            </p>
          </div>
        </div>

        {/* Kolom Kanan: Aksi */}
        <div class="flex items-center gap-2 shrink-0">
          <a href={`/admin/users/edit/${user.id}`} class="px-4 py-2.5 bg-slate-50 text-slate-700 text-[10px] font-black uppercase tracking-wider rounded-xl hover:bg-slate-200 transition-all text-center">Edit</a>
          
          <button 
            type="button"
            onClick={() => setIsDeleteModalOpen(true)}
            class="px-4 py-2.5 bg-red-50 text-red-600 text-[10px] font-black uppercase tracking-wider rounded-xl hover:bg-red-100 transition-all"
          >
            Hapus
          </button>

          {/* Hidden Delete Form */}
          <form ref={deleteFormRef} method="POST" action={actions.deleteUser} class="hidden">
            <input type="hidden" name="id" value={user.id} />
          </form>
          
          <div class="hidden md:block ml-2 text-[10px] font-black text-slate-300 uppercase tracking-wider px-3 py-1 border border-slate-100 rounded-lg">
            ID: {user.id.split('-')[0]}
          </div>
        </div>
      </div>

      {/* Delete User Modal */}
      <AdminModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleConfirmDelete}
        title="Hapus Pengguna"
        description={`Apakah Anda yakin ingin menghapus user "${user.full_name}"? Semua data tulisan dan profilnya akan ikut terhapus selamanya.`}
        confirmText="Ya, Hapus User"
        variant="danger"
      />
    </div>
  );
}

