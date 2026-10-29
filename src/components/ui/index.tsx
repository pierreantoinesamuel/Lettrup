import React from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input: React.FC<InputProps> = ({ label, error, className = '', ...props }) => {
  return (
    <div className="w-full">
      {label && <label className="block text-sm font-medium text-gray-700 uppercase mb-1">{label}</label>}
      <input
        className={`w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-base font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:bg-white transition-all ${
          error ? 'border-red-400 bg-red-50/50' : ''
        } ${className}`}
        {...props}
      />
      {error && <span className="text-[11px] font-medium text-red-500 mt-0.5 block">{error}</span>}
    </div>
  );
};

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export const Textarea: React.FC<TextareaProps> = ({ label, error, className = '', ...props }) => {
  return (
    <div className="w-full">
      {label && <label className="block text-sm font-medium text-gray-700 uppercase mb-1">{label}</label>}
      <textarea
        className={`w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-base font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:bg-white transition-all ${
          error ? 'border-red-400 bg-red-50/50' : ''
        } ${className}`}
        {...props}
      />
      {error && <span className="text-[11px] font-medium text-red-500 mt-0.5 block">{error}</span>}
    </div>
  );
};

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
}

export const Button: React.FC<ButtonProps> = ({ variant = 'primary', children, className = '', ...props }) => {
  const base = 'px-4 py-2.5 rounded-xl text-xs font-bold transition-all shadow-2xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed';
  const variants = {
    primary: 'bg-indigo-600 hover:bg-indigo-500 text-white',
    secondary: 'bg-gray-100 hover:bg-gray-200 text-gray-800',
    outline: 'border border-gray-300 hover:bg-gray-50 text-gray-700',
    ghost: 'hover:bg-gray-100 text-gray-600 shadow-none',
    danger: 'bg-red-600 hover:bg-red-500 text-white',
  };

  return (
    <button className={`${base} ${variants[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
};
