import verifyAuthToken from "../config/verifyAuthToken.js";

const isAuth = (req, res, next) => {
  const token = req.cookies?.token;
  if (!token) {
    return res.status(401).json({ message: "Not authenticated!" });
  }

  try {
    req.userId = verifyAuthToken(token);
    return next();
  } catch {
    return res.status(401).json({ message: "Not authenticated!" });
  }
};

export default isAuth;