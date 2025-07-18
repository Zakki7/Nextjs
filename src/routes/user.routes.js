import { Router } from "express";
const router = Router();

router.post("/register", (req, res) => {
  return res.status(200).json({ message: "User Registered" });
});

export default router;
