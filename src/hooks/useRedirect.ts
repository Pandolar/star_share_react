import { useNavigate, useLocation } from 'react-router-dom';
import { useCallback } from 'react';
import { useWhiteLabel } from '../contexts/WhiteLabelContext';

export const useRedirect = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { site_id: siteId } = useWhiteLabel();

  return useCallback(() => {
    const params = new URLSearchParams(location.search);
    const rawFromUrl = params.get('fromurl');
    params.delete('fromurl');
    if (!rawFromUrl) {
      navigate('/user-center', { replace: true });
      return;
    }

    let destination: URL;
    try {
      destination = new URL(decodeURIComponent(rawFromUrl), window.location.origin);
    } catch {
      navigate('/user-center', { replace: true });
      return;
    }
    if (destination.origin !== window.location.origin) {
      // Managed storefronts must not forward account credentials or redirects off-site.
      navigate('/user-center', { replace: true });
      return;
    }
    params.forEach((value, key) => {
      if (!destination.searchParams.has(key)) destination.searchParams.set(key, value);
    });
    const target = `${destination.pathname}${destination.search}${destination.hash}`;
    if (siteId !== null || target.startsWith('/')) {
      navigate(target, { replace: true });
      return;
    }
    navigate('/user-center', { replace: true });
  }, [location.search, navigate, siteId]);
};
