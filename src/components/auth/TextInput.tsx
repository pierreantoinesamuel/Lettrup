import React from 'react';

type TextInputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  icon?: React.ReactNode;
  invalid?: boolean;
};

const TextInput = React.forwardRef<HTMLInputElement, TextInputProps>(
  ({ icon, invalid, className = '', ...props }, ref) => (
    <div className="relative">
      {icon && (
        <span
          className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-600 pointer-events-none"
          aria-hidden="true"
        >
          {icon}
        </span>
      )}
      <input
        ref={ref}
        aria-invalid={invalid || undefined}
        className={`w-full min-h-12 ${icon ? 'pl-10' : 'pl-4'} pr-4 py-3 rounded-xl bg-white border text-base leading-6 text-slate-950 placeholder:text-slate-500 focus:ring-2 focus:ring-[#bcefe4] outline-hidden transition-colors ${
          invalid ? 'border-red-500 focus:border-red-600' : 'border-slate-300 focus:border-[#007568]'
        } ${className}`}
        {...props}
      />
    </div>
  )
);
TextInput.displayName = 'TextInput';

export default TextInput;
