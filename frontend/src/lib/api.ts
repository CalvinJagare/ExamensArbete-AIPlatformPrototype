//backend host follows window
const host = typeof window !== 'undefined' ? window.location.hostname : 'localhost'
export const API = `http://${host}:8000`
