import { auth } from "express-oauth2-jwt-bearer";

const authRequired = process.env.AUTH_REQUIRED === "true";
const issuerBaseURL = process.env.AUTH0_ISSUER_BASE_URL;
const audience = process.env.AUTH0_AUDIENCE;

const jwtCheck = auth({
  issuerBaseURL,
  audience,
  tokenSigningAlg: "RS256"
});

export function requireAuth(req, res, next) {
  if (!authRequired) {
    return next();
  }
  if (!issuerBaseURL || !audience) {
    return res.status(500).json({
      error: "Auth0 not configured",
      hint: "Set AUTH0_ISSUER_BASE_URL and AUTH0_AUDIENCE or disable AUTH_REQUIRED"
    });
  }
  return jwtCheck(req, res, next);
}

export function getUserSub(req) {
  return req.auth?.payload?.sub || null;
}
