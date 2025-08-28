const jwt = require("jsonwebtoken");
const secret_key = "dbwffrakegsbchikkkaltgtafgdybnnnnnnstbdhjdnndiqdwfufwqfoihfsdfbfwauifgwfxwnfwfufef";

const verifyToken = (req, res, next) => {
  try {
    const authHeader = req.headers["authorization"];
    
    if (!authHeader) {
      return res.status(401).json({
        ok: false,
        error: "Token is missing",
      });
    }

    // Check if the header starts with "Bearer "
    if (!authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        ok: false,
        error: "Invalid token format. Use 'Bearer <token>'",
      });
    }

    const token = authHeader.slice(7); // Remove "Bearer " prefix
    
    jwt.verify(token, secret_key, (error, data) => {
      if (error) {
        return res.status(401).json({
          ok: false,
          error: "Token is invalid",
        });
      }
      
      req.userdata = data;
      next();
    });
  } catch (error) {
    console.error("Token verification error:", error);
    return res.status(500).json({
      ok: false,
      error: "Internal server error during token verification",
    });
  }
};

module.exports = verifyToken;