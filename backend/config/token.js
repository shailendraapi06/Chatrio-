import jwt from "jsonwebtoken";

const genToken = async (id) => {
    try {
        const token =  await jwt.sign({ userId: id }, process.env.JWT_SECRET, { expiresIn: "7d" });
        return token;
    } catch (error) {
        console.error("Error generating token:", error);
        throw new Error("Error generating token");
    } 
};

export default genToken;