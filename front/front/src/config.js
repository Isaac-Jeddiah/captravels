const ENV = import.meta.env.VITE_APP_ENV || "development";

const get = (devKey, prodKey, fallback) => {
  if (ENV === "production") return import.meta.env[prodKey] || import.meta.env.VITE_API_URL || fallback;
  return import.meta.env[devKey] || import.meta.env.VITE_API_URL || fallback;
};

export const API_URL = get("VITE_API_URL_DEV", "VITE_API_URL_PROD", "http://localhost:5000");
export const TURNSTILE_SITEKEY = get("VITE_TURNSTILE_SITEKEY_DEV", "VITE_TURNSTILE_SITEKEY_PROD", "");
export default ENV;
