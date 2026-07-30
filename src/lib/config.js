function getConfig() {
  return {
    verifyToken: process.env.META_VERIFY_TOKEN || '',
    appSecret: process.env.META_APP_SECRET || '',
  };
}

module.exports = { getConfig };
