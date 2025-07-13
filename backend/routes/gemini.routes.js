import { Router } from "express";
import { getResult } from "../controllers/gemini.controller.js";

const router = Router()

router.get('/get-result', getResult)

export const geminiRouter = router