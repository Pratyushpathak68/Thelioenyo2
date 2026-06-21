export const formatINR = (n) =>
  `₹${Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

export const cn = (...args) => args.filter(Boolean).join(" ");

export const resolveAsset = (url) => {
  if (!url) return "";
  if (url.startsWith("http")) return url;
  const base = process.env.REACT_APP_BACKEND_URL || window.location.origin;
  return `${base}${url}`;
};
