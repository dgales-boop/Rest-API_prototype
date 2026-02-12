/**
 * API Key authentication middleware.
 * Validates the X-API-Key header against an in-memory map
 * and attaches the derived tenantId to the request.
 */
function authMiddleware(req, res, next) {
  const apiKey = req.headers["x-api-key"];

  if (!apiKey) {
    return res.status(401).json({ error: "Missing X-API-Key header" });
  }

  let apiKeys;
  try {
    apiKeys = JSON.parse(process.env.API_KEYS || "{}");
  } catch {
    return res
      .status(500)
      .json({ error: "Server misconfiguration: invalid API_KEYS" });
  }

  const tenantId = apiKeys[apiKey];

  if (!tenantId) {
    return res.status(401).json({ error: "Invalid API key" });
  }

  req.tenantId = tenantId;
  next();
}

module.exports = authMiddleware;
