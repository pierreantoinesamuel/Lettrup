import React from 'react';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';

interface AccessibleAlertProps {
  variant: 'error' | 'success';
  children: React.ReactNode;
  id?: string;
}

const AccessibleAlert = React.forwardRef<HTMLDivElement, AccessibleAlertProps>(
  ({ variant, children, id }, ref) => {
    const isError = variant === 'error';
    return (
      <div
        ref={ref}
        id={id}
        role={isError ? 'alert' : 'status'}
        aria-live={isError ? 'assertive' : 'polite'}
        tabIndex={-1}
        className={`mb-4 p-3.5 rounded-xl border text-sm leading-6 flex items-start gap-2.5 outline-hidden focus-visible:ring-2 focus-visible:ring-offset-2 ${
          isError
            ? 'bg-red-50 border-red-200 text-red-800 focus-visible:ring-red-600'
            : 'bg-emerald-50 border-emerald-200 text-emerald-800 focus-visible:ring-emerald-600'
        }`}
      >
        {isError ? (
          <AlertTriangle size={18} className="shrink-0 text-red-700 mt-0.5" aria-hidden="true" />
        ) : (
          <CheckCircle2 size={18} className="shrink-0 text-emerald-700 mt-0.5" aria-hidden="true" />
        )}
        <span>{children}</span>
      </div>
    );
  }
);
AccessibleAlert.displayName = 'AccessibleAlert';

export default AccessibleAlert;
