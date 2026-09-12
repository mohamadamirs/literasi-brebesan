import { useState } from 'preact/hooks';

interface Props {
  accountNumber: string;
  accountName: string;
}

export default function CopyAccount({ accountNumber, accountName }: Props) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(accountNumber).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 mb-6 group/kas relative overflow-hidden">
      <div className="flex justify-between items-start">
        <div>
          <p className="text-lg md:text-xl font-black text-blue-600 leading-none">{accountNumber}</p>
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mt-2">{accountName}</p>
        </div>
        <button 
          onClick={handleCopy}
          className="p-2 bg-white border border-slate-200 rounded-xl text-slate-500 hover:text-blue-600 hover:border-blue-200 transition-all shadow-sm active:scale-90"
          title="Salin No. Rekening"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
        </button>
      </div>
      
      {/* Tooltip Success */}
      <div className={`absolute inset-0 bg-blue-600/95 flex items-center justify-center transition-transform duration-300 ${copied ? 'translate-y-0' : 'translate-y-full'}`}>
         <p className="text-white text-xs font-black uppercase tracking-widest">Berhasil Disalin!</p>
      </div>
    </div>
  );
}
