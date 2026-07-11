import express from "express";
import { getSalesForecast } from "../controllers/predictions.js";

const router = express.Router();

router.get("/sales", getSalesForecast);

export default router;
