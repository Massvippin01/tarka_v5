import React, { useRef, useState } from 'react';
import { UploadCloud } from 'lucide-react';

/** Glass drop target + hidden multi-file picker shared by both Upload Center modes. */
export const DropZone: React.FC<{ onFiles: (files: File[]) => void; title: string; hint: React.ReactNode; disabled?: boolean }> = ({
  onFiles,
  title,
  hint,
  disabled,
}) => {
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const take = (files: FileList | null) => {
    const arr = Array.from(files ?? []).filter((f) => f.size > 0 || f.type !== '');
    if (arr.length && !disabled) onFiles(arr);
  };
  return (
    <div
      role="button"
      tabIndex={0}
      aria-label="Add evidence files"
      aria-disabled={disabled}
      onClick={() => !disabled && inputRef.current?.click()}
      onKeyDown={(e) => !disabled && (e.key === 'Enter' || e.key === ' ') && inputRef.current?.click()}
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        take(e.dataTransfer.files);
      }}
      className={[
        'relative rounded-2xl border border-dashed px-6 py-9 text-center select-none',
        'backdrop-blur-md bg-[var(--surface-1)]/70 shadow-[var(--shadow)] transition-all duration-200',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]',
        disabled ? 'opacity-60 cursor-wait' : 'cursor-pointer',
        dragOver ? 'border-[var(--accent)] bg-[var(--accent-bg)] scale-[1.005]' : 'border-[var(--line-2)] hover:border-[var(--accent)]/60',
      ].join(' ')}
    >
      <input
        ref={inputRef}
        type="file"
        multiple
        hidden
        data-testid="upload-input"
        onChange={(e) => {
          take(e.target.files);
          e.target.value = '';
        }}
      />
      <div className="mx-auto mb-3 w-12 h-12 rounded-xl flex items-center justify-center bg-[var(--accent-bg)] text-[var(--accent)]">
        <UploadCloud className="w-6 h-6" />
      </div>
      <div className="text-[15px] font-semibold text-[var(--fg-1)]">{title}</div>
      <div className="text-[12.5px] text-[var(--fg-3)] mt-1">{hint}</div>
    </div>
  );
};
