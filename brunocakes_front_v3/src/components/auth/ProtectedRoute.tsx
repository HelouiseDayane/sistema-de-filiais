import { ReactNode, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../App';

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { admin } = useApp();
  const navigate = useNavigate();

  useEffect(() => {
    if (!admin || !['master', 'admin', 'employee'].includes(admin.role)) {
      navigate('/admin/login');
    }
  }, [admin, navigate]);

  if (!admin || !['master', 'admin', 'employee'].includes(admin.role)) {
    return null;
  }

  return <>{children}</>;
}