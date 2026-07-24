/**
 * Middleware to extract entrepriseId from headers (or JWT token)
 * and inject it into the request for Option A tenant isolation.
 */
export const requireTenant = (req, res, next) => {
    // In a real scenario, this might come from a decoded JWT payload.
    // For now, we accept it as a header for simplicity, defaulting to demo-tenant
    const entrepriseId = req.headers['x-entreprise-id'] || 'demo-tenant';
    req.entrepriseId = entrepriseId;
    req.userId = 'user-test-id'; // injected automatically
    next();
};
//# sourceMappingURL=tenant.js.map