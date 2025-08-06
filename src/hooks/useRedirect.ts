
import { useNavigate, useLocation } from 'react-router-dom';
import { useCallback } from 'react';

export const useRedirect = () => {
    const navigate = useNavigate();
    const location = useLocation();

    const redirect = useCallback(() => {
        const params = new URLSearchParams(location.search);
        const fromUrl = params.get('fromurl');
        params.delete('fromurl');
        const restParams = params.toString();
        
        if (fromUrl) {
            const finalUrl = restParams ? `${fromUrl}?${restParams}` : fromUrl;
            // Use replace to avoid adding to history stack
            window.location.replace(finalUrl);
        } else {
            navigate('/', { replace: true });
        }
    }, [location.search, navigate]);

    return redirect;
};
