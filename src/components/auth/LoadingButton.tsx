import React from 'react';
import { Loader2 } from 'lucide-react';

interface LoadingButtonProps {
  loading?: boolean;
  loadingText: string;
  variant?: 'primary' | 'secondary';
  type?: 'button' | 'submit' | 'reset';
  disabled?: boolean;
  onClick?: () => void;
  className?: string;
  children: React.ReactNode;
}

export default function LoadingButton({
  loading,
  loadingText,
  children,
  disabled,
  className = '',
  variant = 'primary',
  type = 'submit',
  ...props
}: LoadingButtonProps) {
  const base =
    'min-h-12 py-3 px-4 rounded-xl font-semibold text-base leading-6 transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:ring-[#007568] focus-visible:ring-offset-2 outline-hidden';
  const variantClass =
    variant === 'primary'
      ? 'bg-tertiary hover:bg-[#093b50] text-white'
      : 'bg-slate-100 hover:bg-slate-200 text-slate-800';

  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={`${base} ${variantClass} ${className}`}
      {...props}
    >
      {loading ? (
        <>
          <Loader2 size={18} className="animate-spin motion-reduce:animate-none" aria-hidden="true" />
          <span>{loadingText}</span>
        </>
      ) : (
        children
      )}
    </button>
  );
}
