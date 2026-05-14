
import { useNavigate, useLocation } from 'react-router-dom';
import { useCallback } from 'react';
import { getCookie } from '../utils/cookies';

export const useRedirect = () => {
    const navigate = useNavigate();
    const location = useLocation();

    const redirect = useCallback(() => {
        const params = new URLSearchParams(location.search);
        const rawFromUrl = params.get('fromurl');

        // Remove internal-only param so it doesn't get duplicated
        params.delete('fromurl');

        if (!rawFromUrl) {
            navigate('/sharespeedtest', { replace: true });
            return;
        }

        // fromurl may be URL-encoded by the caller; decode safely
        let decodedFromUrl = rawFromUrl;
        try {
            decodedFromUrl = decodeURIComponent(rawFromUrl);
        } catch (_) {
            // keep original if decode fails
        }

        // Build final URL robustly and merge params
        let url: URL;
        try {
            url = new URL(decodedFromUrl);
        } catch (_) {
            // If relative URL, resolve against current origin
            url = new URL(decodedFromUrl, window.location.origin);
        }

        // Preserve any remaining query params from current page
        // (e.g., domain, flags). Avoid overwriting existing keys.
        params.forEach((value, key) => {
            if (!url.searchParams.has(key)) {
                url.searchParams.set(key, value);
            }
        });

        // For compatibility with new third-party login JS:
        // append auth credentials as URL params if available.
        const xuserid = getCookie('xuserid');
        const xtoken = getCookie('xtoken');
        const xy_uuid_token = getCookie('xy_uuid_token');

        if (xuserid) url.searchParams.set('xuserid', xuserid);
        if (xtoken) url.searchParams.set('xtoken', xtoken);
        if (xy_uuid_token) url.searchParams.set('xy_uuid_token', xy_uuid_token);

        // Avoid adding to history stack
        window.location.replace(url.toString());
    }, [location.search, navigate]);

    return redirect;
};
