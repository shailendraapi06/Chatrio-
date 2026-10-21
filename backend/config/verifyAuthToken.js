import jwt from "jsonwebtoken";

const verifyAuthToken = (token) => {
  const payload = jwt.verify(token, process.env.JWT_SECRET);
  if (typeof payload.userId !== "string") {
    throw new Error("Invalid authentication token.");
  }
  return payload.userId;
};

export default verifyAuthToken;
