import React from 'react';
import AccessibleAlert from './AccessibleAlert';

const FormError = React.forwardRef<HTMLDivElement, { children: React.ReactNode; id?: string }>(
  ({ children, id }, ref) => (
    <AccessibleAlert ref={ref} variant="error" id={id}>
      {children}
    </AccessibleAlert>
  )
);
FormError.displayName = 'FormError';

export default FormError;
