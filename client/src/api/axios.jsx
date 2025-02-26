import axios from 'axios';

let BASE_URL;

if (import.meta.env.VITE_ENV === 'dev') {
    BASE_URL = import.meta.env.VITE_DEV_API_URL;
} else {
    BASE_URL = `https://api.${import.meta.env.VITE_DOMAIN_NAME}`;
} 

export default axios.create({
    baseURL: BASE_URL
});

export const axiosPrivate = axios.create({
    baseURL: BASE_URL,
    headers: { 'Content-Type': 'application/json' },
    withCredentials: true
});