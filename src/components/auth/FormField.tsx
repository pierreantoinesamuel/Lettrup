import React from 'react';

interface FormFieldProps {
  label: string;
  htmlFor: string;
  required?: boolean;
  error?: string;
  helperText?: string;
  children: React.ReactNode;
}

export function fieldDescribedBy(
  htmlFor: string,
  opts: { hasError?: boolean; hasHelper?: boolean }
): string | undefined {
  if (opts.hasError) return `${htmlFor}-error`;
  if (opts.hasHelper) return `${htmlFor}-helper`;
  return undefined;
}

export default function FormField({ label, htmlFor, required, error, helperText, children }: FormFieldProps) {
  return (
    <div>
      <label htmlFor={htmlFor} className="block text-[0.9375rem] leading-5 font-semibold text-slate-800 mb-2">
        {label}
        {required && (
          <>
            <span aria-hidden="true" className="text-[#007568] ml-0.5">*</span>
            <span className="sr-only"> (obligatoire)</span>
          </>
        )}
      </label>
      {children}
      {helperText && !error && (
        <p id={`${htmlFor}-helper`} className="mt-2 text-sm leading-5 text-slate-600">
          {helperText}
        </p>
      )}
      {error && (
        <p id={`${htmlFor}-error`} className="mt-2 text-sm leading-5 font-medium text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}
