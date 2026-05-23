import requestIp from 'request-ip'; // Note: request-ip can be added later or we just extract from req
import geoip from 'geoip-lite'; // Geo IP

const userInfoMiddleware = (req, res, next) => {
  try {
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || req.ip;
    
    // For local development, assume India
    let location = {
      ip,
      country: 'IN',
      region: 'Delhi',
      city: 'New Delhi',
      lat: 28.6139,
      lon: 77.2090
    };

    // If using geoip-lite, you can do: const geo = geoip.lookup(ip);
    
    req.userLocation = location;
    next();
  } catch (error) {
    req.userLocation = {};
    next();
  }
};

export default userInfoMiddleware;
