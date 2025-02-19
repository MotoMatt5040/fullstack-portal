import axios from 'axios';

let BASE_URL;

if (import.meta.env.VITE_ENV === 'dev') {
    BASE_URL = import.meta.env.VITE_DEV_API_URL;
} else if (import.meta.env.VITE_ENV === 'docker') {
    BASE_URL = import.meta.env.VITE_DOCKER_API_URL;
}

export default axios.create({
    baseURL: BASE_URL
});

export const axiosPrivate = axios.create({
    baseURL: BASE_URL,
    headers: { 'Content-Type': 'application/json' },
    withCredentials: true
});