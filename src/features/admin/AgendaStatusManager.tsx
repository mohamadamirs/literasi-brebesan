import { useState } from 'preact/hooks';

interface Props {
  initialStatus: 'draft' | 'published' | 'scheduled';
  initialPublishAt: string | null;
}

export default function AgendaStatusManager({ initialStatus, initialPublishAt }: Props) {
  const [status, setStatus] = useState(initialStatus);

  return (
    <div class="bg-slate-100 p-6 rounded-[2rem] space-y-4">
      <label class="block text-[11px] font-black uppercase text-slate-900 text-center">Update Status</label>
      
      <div class="flex flex-wrap bg-white p-2 rounded-2xl md:rounded-full gap-1 border border-slate-200">
        <label class="flex-1 min-w-[100px] cursor-pointer">
          <input 
            type="radio" 
            name="status" 
            value="draft" 
            class="peer hidden" 
            checked={status === 'draft'} 
            onChange={() => setStatus('draft')}
          />
          <div class="text-center py-3 rounded-xl md:rounded-full text-[11px] font-black uppercase text-slate-500 peer-checked:bg-slate-100 peer-checked:text-slate-900 transition-all">Draft</div>
        </label>
        
        <label class="flex-1 min-w-[100px] cursor-pointer">
          <input 
            type="radio" 
            name="status" 
            value="scheduled" 
            class="peer hidden" 
            checked={status === 'scheduled'} 
            onChange={() => setStatus('scheduled')}
          />
          <div class="text-center py-3 rounded-xl md:rounded-full text-[11px] font-black uppercase text-slate-500 peer-checked:bg-amber-500 peer-checked:text-white transition-all">Terjadwal</div>
        </label>
        
        <label class="flex-1 min-w-[100px] cursor-pointer">
          <input 
            type="radio" 
            name="status" 
            value="published" 
            class="peer hidden" 
            checked={status === 'published'} 
            onChange={() => setStatus('published')}
          />
          <div class="text-center py-3 rounded-xl md:rounded-full text-[11px] font-black uppercase text-slate-500 peer-checked:bg-blue-600 peer-checked:text-white transition-all">Tayang</div>
        </label>
      </div>

      {/* Input Tanggal Rilis Otomatis (Hanya muncul jika terjadwal) */}
      {status === 'scheduled' && (
        <div class="animate-in fade-in slide-in-from-top-2 duration-300">
          <label class="block text-[10px] font-black uppercase text-slate-500 mb-2 mt-4 text-center">Tanggal & Waktu Rilis Otomatis</label>
          <input 
            type="datetime-local" 
            name="publish_at" 
            value={initialPublishAt ? new Date(initialPublishAt).toISOString().slice(0, 16) : ''}
            required
            class="w-full px-6 py-4 bg-white border border-slate-200 rounded-[1.5rem] font-bold text-slate-700 outline-none focus:border-amber-500 transition-all shadow-sm"
          />
        </div>
      )}

      {/* Opsi Timpa Agenda (Hanya muncul jika tayang) */}
      {status === 'published' && (
        <div class="animate-in fade-in slide-in-from-top-2 duration-300">
           <label class="flex items-center gap-3 p-4 bg-white rounded-2xl border border-slate-200 cursor-pointer hover:border-blue-200 transition-all shadow-sm">
             <input type="checkbox" name="override_published" value="true" class="w-5 h-5 rounded-lg text-blue-600 border-slate-300 focus:ring-blue-500" />
             <span class="text-xs font-bold text-slate-700">Timpa agenda yang sedang tayang saat ini</span>
           </label>
        </div>
      )}
    </div>
  );
}
