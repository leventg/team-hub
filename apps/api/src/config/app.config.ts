export default () => ({
  port: parseInt(process.env.PORT || '3001', 10),
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    username: process.env.DB_USER || 'team_hub',
    password: process.env.DB_PASSWORD || 'team_hub_pass',
    database: process.env.DB_NAME || 'team_hub',
    schema: process.env.DB_SCHEMA || 'team_hub',
  },
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
  },
  keycloak: {
    realm: process.env.KEYCLOAK_REALM || 'team-hub',
    authServerUrl: process.env.KEYCLOAK_URL || 'http://localhost:8080',
    clientId: process.env.KEYCLOAK_CLIENT_ID || 'team-hub-api',
    secret: process.env.KEYCLOAK_CLIENT_SECRET || '',
  },
  jwt: {
    jwksUri: process.env.JWKS_URI || 'http://localhost:8080/realms/team-hub/protocol/openid-connect/certs',
    issuer: process.env.JWT_ISSUER || 'http://localhost:8080/realms/team-hub',
    audience: process.env.JWT_AUDIENCE || '',
  },
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  },
});
