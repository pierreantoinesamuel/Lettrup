import React from 'react';
import AccessibleAlert from './AccessibleAlert';

export default function FormSuccess({ children, id }: { children: React.ReactNode; id?: string }) {
  return (
    <AccessibleAlert variant="success" id={id}>
      {children}
    </AccessibleAlert>
  );
}
