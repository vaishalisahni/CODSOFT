import Redis from "ioredis";

export const redis = new Redis(process.env.REDIS_URL);

// Add error handling
redis.on('error', (err) => {
  console.error('Redis connection error:', err);
});

redis.on('connect', () => {
  console.log('Redis connected successfully');
});

export const storeRefreshToken = async (userId, refreshToken) => {
  await redis.set(`refresh_token:${userId}`, refreshToken, "EX", 7 * 24 * 60 * 60); // 7 days
};

export const getStoredRefreshToken = async (userId) => {
  return await redis.get(`refresh_token:${userId}`);
};

export const deleteRefreshToken = async (userId) => {
  await redis.del(`refresh_token:${userId}`);
};