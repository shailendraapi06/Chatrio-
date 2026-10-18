import jwt from "jsonwebtoken";

const isAuth = (req, res, next) => {
  const token = req.cookies?.token;
  if (!token) {
    return res.status(401).json({ message: "Not authenticated!" });
  }

  try {
    const verifiedToken = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = verifiedToken.userId;
    return next();
  } catch {
    return res.status(401).json({ message: "Not authenticated!" });
  }
};

export default isAuth;