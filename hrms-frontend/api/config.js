module.exports = (req, res) => {
  // Enable CORS headers for Vercel deployment
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Retrieve backend URL from Vercel environment variables
  const rawBackendUrl =
    process.env.BACKEND_URL ||
    process.env.NEXT_PUBLIC_BACKEND_URL ||
    process.env.API_URL ||
    process.env.VERCEL_BACKEND_URL ||
    'http://localhost:8080';

  const backendUrl = rawBackendUrl.trim().replace(/\/$/, '');

  return res.status(200).json({
    backendUrl: backendUrl
  });
};
