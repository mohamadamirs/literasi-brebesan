import { useState, useEffect, useRef } from 'preact/hooks';

interface Props {
  name: string;
  value?: string;
  placeholder?: string;
  className?: string;
}

export default function TitleEditor({ 
  name, 
  value = "", 
  placeholder = "Tulis judul yang memikat...", 
  className = "" 
}: Props) {
  const [title, setTitle] = useState(value);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const adjustHeight = () => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = 'auto';
      el.style.height = `${el.scrollHeight}px`;
    }
  };

  useEffect(() => {
    adjustHeight();
    // Re-adjust on window resize
    window.addEventListener('resize', adjustHeight);
    return () => window.removeEventListener('resize', adjustHeight);
  }, [title]);

  const handleChange = (e: any) => {
    setTitle(e.target.value);
  };

  return (
    <textarea
      ref={textareaRef}
      name={name}
      value={title}
      onInput={handleChange}
      required
      rows={1}
      placeholder={placeholder}
      className={`w-full bg-transparent border-b-2 border-slate-100 focus:border-blue-600 outline-none transition-all font-black text-xl md:text-3xl lg:text-5xl text-slate-900 placeholder:text-slate-200 resize-none overflow-hidden pb-2 ${className}`}
    />
  );
}
