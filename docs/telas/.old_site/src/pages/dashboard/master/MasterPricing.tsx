import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function MasterPricing() {
  const navigate = useNavigate();

  useEffect(() => {
    navigate('/master/work-types', { replace: true });
  }, [navigate]);

  return null;
}
