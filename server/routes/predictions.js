import express from "express";
import {
  getSalesForecast,
  getCustomerSegments,
  getProductClassification,
} from "../controllers/predictions.js";

const router = express.Router();

router.get("/sales", getSalesForecast);
router.get("/segments", getCustomerSegments);
router.get("/classification", getProductClassification);

export default router;
