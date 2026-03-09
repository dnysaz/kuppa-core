const NodeCache = require("node-cache");

// Dedicated cache instance for users
// Standard TTL 10 minutes
const userCache = new NodeCache({ stdTTL: 600, checkperiod: 120 });

module.exports = userCache;