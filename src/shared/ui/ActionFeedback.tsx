import { useState, useEffect } from 'preact/hooks';
import AdminModal from "@/features/admin/AdminModal";

export default function ActionFeedback() {
  const [modalConfig, setModalType] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    variant: 'success' | 'danger';
  }>({
    isOpen: false,
    title: '',
    description: '',
    variant: 'success'
  });

  useEffect(() => {
    // Jalankan pengecekan URL saat halaman dimuat
    const checkUrl = () => {
      const params = new URLSearchParams(window.location.search);
      const successMsg = params.get('success');
      const errorMsg = params.get('error');

      if (successMsg) {
        setModalType({
          isOpen: true,
          title: 'Berhasil!',
          description: successMsg,
          variant: 'success'
        });
        // Bersihkan URL tanpa reload
        const newUrl = new URL(window.location.href);
        newUrl.searchParams.delete('success');
        window.history.replaceState({}, '', newUrl);
      } else if (errorMsg) {
        setModalType({
          isOpen: true,
          title: 'Terjadi Kesalahan',
          description: errorMsg,
          variant: 'danger'
        });
        const newUrl = new URL(window.location.href);
        newUrl.searchParams.delete('error');
        window.history.replaceState({}, '', newUrl);
      }
    };

    checkUrl();

    // Dengar perubahan navigasi (Astro View Transitions)
    document.addEventListener('astro:page-load', checkUrl);
    return () => document.removeEventListener('astro:page-load', checkUrl);
  }, []);

  return (
    <AdminModal
      isOpen={modalConfig.isOpen}
      onClose={() => setModalType({ ...modalConfig, isOpen: false })}
      onConfirm={() => setModalType({ ...modalConfig, isOpen: false })}
      title={modalConfig.title}
      description={modalConfig.description}
      variant={modalConfig.variant}
      confirmText="Oke, Mengerti"
      cancelText="" // Sembunyikan tombol batal untuk modal informasi
    />
  );
}
