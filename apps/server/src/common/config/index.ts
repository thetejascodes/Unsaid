
function optional(key:string,fallback:string){
    return process.env[key] ?? fallback;
}

function required(key: string) {
  const value = process.env[key];
  if (!value) {
    throw new Error("Missing required env var: " + key);
  }
  return value;
}

export const config = {
  jwt: {
    accessSecret: required("JWT_ACCESS_SECRET"),
    refreshSecret: required("JWT_REFRESH_SECRET"),
    accessExpiresIn: optional("JWT_ACCESS_EXPIRES_IN", "15m"),
    refreshExpiresIn: optional("JWT_REFRESH_EXPIRES_IN", "7d"),
  },
  database:{
    url: required("DATABASE_URL")
  },
  port:Number(optional("PORT","8000")),
};
