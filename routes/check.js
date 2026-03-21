const express = require("express");
const router = express.Router();

const { calculateScore } = require("../scoring/scoring");
const { getGroqResponse, verifyDocumentType } = require("../groq/groq");

router.post("/", async (req, res) => {
  try {
    const data = req.body;
    console.log("Received data for scoring:", data);

    // 1. If images are provided, verify them using AI Vision
    const verifiedDocs = [];
    if (data.images && Array.isArray(data.images)) {
      for (const base64Image of data.images) {
        const verifiedType = await verifyDocumentType(base64Image);
        console.log("AI Verified Document Type:", verifiedType);
        if (verifiedType !== "Unknown") {
          verifiedDocs.push(verifiedType);
        }
      }
    }

    // Use verifiedDocs instead of just checkbox data
    const scoreData = calculateScore({ ...data, documents: verifiedDocs });
    console.log("Calculated score data with verified docs:", scoreData);

    const ai = await getGroqResponse(scoreData);

    res.json({
      ...scoreData,
      ai,
    });
  } catch (error) {
    console.error("Error in scoring route:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

module.exports = router;