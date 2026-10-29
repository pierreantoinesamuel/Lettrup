import React, { useState } from 'react';
import { Lock } from 'lucide-react';
import FormField, { fieldDescribedBy } from './FormField';
import PasswordVisibilityToggle from './PasswordVisibilityToggle';

interface PasswordFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete: 'new-password' | 'current-password';
  required?: boolean;
  error?: string;
  helperText?: string;
  placeholder?: string;
  children?: React.ReactNode;
  invalid?: boolean;
  describedBy?: string;
}

export default function PasswordField({
  id,
  label,
  value,
  onChange,
  autoComplete,
  required,
  error,
  helperText,
  placeholder,
  children,
  invalid,
  describedBy,
}: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);
  const isInvalid = invalid || !!error;

  return (
    <FormField label={label} htmlFor={id} required={required} error={error} helperText={helperText}>
      <div className="relative">
        <Lock
          size={18}
          className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-600 pointer-events-none"
          aria-hidden="true"
        />
        <input
          id={id}
          type={visible ? 'text' : 'password'}
          required={required}
          autoComplete={autoComplete}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          aria-invalid={isInvalid || undefined}
          aria-describedby={describedBy ?? fieldDescribedBy(id, { hasError: !!error, hasHelper: !!helperText })}
          className={`w-full min-h-12 pl-10 pr-12 py-3 rounded-xl bg-white border text-base leading-6 text-slate-950 placeholder:text-slate-500 focus:ring-2 focus:ring-[#bcefe4] outline-hidden transition-colors ${
            isInvalid ? 'border-red-500 focus:border-red-600' : 'border-slate-300 focus:border-[#007568]'
          }`}
        />
        <PasswordVisibilityToggle visible={visible} onToggle={() => setVisible((v) => !v)} controls={id} />
      </div>
      {children}
    </FormField>
  );
}
