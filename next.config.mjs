/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Les images sont servies via des URLs signées Supabase ; pas d'optimisation distante nécessaire.
  images: { unoptimized: true },
  // Les polices sont chargées via <link> Google Fonts ; on désactive l'inlining
  // automatique (qui nécessiterait un accès réseau au build).
  optimizeFonts: false,
};

export default nextConfig;
