import { useState, useEffect } from 'preact/hooks';
import { createPortal } from 'preact/compat';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (data?: string) => void;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  showInput?: boolean;
  inputPlaceholder?: string;
  variant?: 'danger' | 'warning' | 'info' | 'success';
}

export default function AdminModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title, 
  description, 
  confirmText = "Ya, Lanjutkan", 
  cancelText = "Batal",
  showInput = false,
  inputPlaceholder = "Masukkan alasan...",
  variant = 'info'
}: Props) {
  const [inputValue, setInputValue] = useState('');

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      const handleEsc = (e: KeyboardEvent) => {
        if (e.key === 'Escape') onClose();
      };
      window.addEventListener('keydown', handleEsc);
      return () => {
        document.body.style.overflow = '';
        window.removeEventListener('keydown', handleEsc);
      };
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const getIcon = () => {
    switch (variant) {
      case 'danger':
        return (
          <div className="w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center text-red-600 mb-6 group-hover:scale-110 transition-transform duration-500">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </div>
        );
      case 'warning':
        return (
          <div className="w-14 h-14 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-600 mb-6 group-hover:scale-110 transition-transform duration-500">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
        );
      case 'success':
        return (
          <div className="w-14 h-14 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600 mb-6 group-hover:scale-110 transition-transform duration-500">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3">
              <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
        );
      default:
        return (
          <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600 mb-6 group-hover:scale-110 transition-transform duration-500">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        );
    }
  };

  const modalContent = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 overflow-hidden">
      {/* Backdrop with enhanced blur */}
      <div 
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-xl animate-in fade-in duration-700"
        onClick={onClose}
      ></div>

      {/* Modal Card */}
      <div className="relative bg-white w-full max-w-md rounded-[2.5rem] shadow-[0_40px_80px_-15px_rgba(0,0,0,0.35)] border border-slate-100/50 animate-scale-in group">
        
        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute top-6 right-6 p-2 text-slate-300 hover:text-slate-900 hover:bg-slate-50 rounded-full transition-all duration-300 z-20"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="p-10 pt-12">
          {getIcon()}

          <div className="mb-8">
            <h3 className="text-2xl md:text-3xl font-black text-slate-900 leading-tight mb-3 tracking-tight">
              {title}
            </h3>
            <div className="max-h-60 overflow-y-auto pr-2 custom-scrollbar">
              <p className="text-[13px] md:text-sm text-slate-500 font-bold leading-relaxed whitespace-pre-wrap break-words">
                {description}
              </p>
            </div>
          </div>

          {showInput && (
            <div className="mb-10 relative">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block mb-3 pl-1">Pesan untuk penulis</label>
              <textarea
                autoFocus
                className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-blue-500 focus:bg-white transition-all font-medium text-slate-700 text-sm placeholder:text-slate-300 shadow-inner"
                rows={3}
                placeholder={inputPlaceholder}
                value={inputValue}
                onInput={(e: any) => setInputValue(e.target.value)}
              />
              {inputValue.length > 0 && inputValue.length < 5 && (
                <div className="flex items-center gap-1.5 mt-2 pl-1 animate-in slide-in-from-left-2 duration-300">
                   <div className="w-1 h-1 rounded-full bg-red-500"></div>
                   <p className="text-[10px] font-black text-red-500 uppercase tracking-wider">Minimal 5 karakter</p>
                </div>
              )}
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3">
            {cancelText !== "" && (
              <button
                onClick={onClose}
                className="px-6 py-4 rounded-2xl bg-white border-2 border-slate-100 text-slate-500 font-black uppercase tracking-wider text-[11px] hover:bg-slate-50 hover:text-slate-900 transition-all active:scale-95 flex-1 order-2 sm:order-1"
              >
                {cancelText}
              </button>
            )}
            <button
              disabled={showInput && inputValue.length < 5}
              onClick={() => onConfirm(showInput ? inputValue : undefined)}
              className={`px-8 py-4 rounded-2xl text-white font-black uppercase tracking-wider text-[11px] transition-all active:scale-95 shadow-xl disabled:opacity-50 disabled:grayscale flex-1 order-1 sm:order-2 flex items-center justify-center gap-2 ${
                variant === 'danger' ? 'bg-red-600 shadow-red-200 hover:bg-slate-900 hover:shadow-slate-200' : 
                variant === 'warning' ? 'bg-amber-500 shadow-amber-200 hover:bg-slate-900 hover:shadow-slate-200' : 
                variant === 'success' ? 'bg-emerald-600 shadow-emerald-200 hover:bg-slate-900 hover:shadow-slate-200' :
                'bg-blue-600 shadow-blue-200 hover:bg-slate-900 hover:shadow-slate-200'
              }`}
            >
              {confirmText}
              {variant !== 'success' && (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="4">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
