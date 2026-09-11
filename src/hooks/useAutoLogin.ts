
import { useEffect, useState } from 'react';
import { checkToken } from '../services/authApi';
import { getCookie, removeCookie } from '../utils/cookies';
import { useRedirect } from './useRedirect';

export const useAutoLogin = () => {
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const redirect = useRedirect();

    useEffect(() => {
        const autoLogin = async () => {
            const xuserid = getCookie('xuserid');
            const xtoken = getCookie('xtoken');

            // 与后端契约一致：登录态只由 xuserid + xtoken 决定
            if (xuserid && xtoken) {
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
