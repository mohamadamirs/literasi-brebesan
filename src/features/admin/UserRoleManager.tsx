import { useState } from 'preact/hooks';

interface Props {
  initialRole: 'user' | 'admin';
}

export default function UserRoleManager({ initialRole }: Props) {
  const [role, setRole] = useState(initialRole);

  return (
    <div class="group">
      <label class="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-4">Peran (Role)</label>
      
      <div class="relative inline-flex p-1 bg-slate-100 rounded-2xl border border-slate-200 overflow-hidden">
        {/* Sliding Background Indicator */}
        <div 
          class="absolute top-1 bottom-1 left-1 w-[calc(50%-4px)] bg-blue-600 rounded-xl transition-all duration-300 ease-in-out shadow-lg shadow-blue-200 z-0"
          style={{ transform: role === 'admin' ? 'translateX(100%)' : 'translateX(0)' }}
        ></div>

        <label class="relative z-10 cursor-pointer">
          <input 
            type="radio" 
            name="role" 
            value="user" 
            class="peer hidden" 
            checked={role === 'user'} 
            onChange={() => setRole('user')}
          />
          <div class={`px-8 py-2.5 text-[10px] font-black uppercase tracking-wider transition-colors duration-300 ${role === 'user' ? 'text-white' : 'text-slate-500 hover:text-slate-900'}`}>
            Anggota / User
          </div>
        </label>
        
        <label class="relative z-10 cursor-pointer">
          <input 
            type="radio" 
            name="role" 
            value="admin" 
            class="peer hidden" 
            checked={role === 'admin'} 
            onChange={() => setRole('admin')}
          />
          <div class={`px-8 py-2.5 text-[10px] font-black uppercase tracking-wider transition-colors duration-300 ${role === 'admin' ? 'text-white' : 'text-slate-500 hover:text-slate-900'}`}>
            Administrator
          </div>
        </label>
      </div>
    </div>
  );
}
