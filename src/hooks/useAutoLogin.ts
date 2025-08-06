
import { useEffect, useState } from 'react';
import { checkToken } from '../services/authApi';
import { getCookie, removeCookie } from '../utils/cookieUtils';
import { useRedirect } from './useRedirect';

export const useAutoLogin = () => {
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const redirect = useRedirect();

    useEffect(() => {
        const autoLogin = async () => {
            const xuserid = getCookie('xuserid');
            const xtoken = getCookie('xtoken');
            const xyUuidToken = getCookie('xy_uuid_token');

            if (xuserid && xtoken && xyUuidToken) {
                try {
                    const response = await checkToken(xuserid, xtoken);
                    if (response.code === 20000) {
                        setIsLoggedIn(true);
                        setTimeout(() => {
                            redirect();
                        }, 2000);
                    } else {
                        removeCookie('xuserid');
                        removeCookie('xtoken');
                        removeCookie('xy_uuid_token');
                    }
                } catch (error) {
                    removeCookie('xuserid');
                    removeCookie('xtoken');
                    removeCookie('xy_uuid_token');
                }
            }
        };

        autoLogin();
    }, [redirect]);

    return isLoggedIn;
};
