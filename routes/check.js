const express = require("express");
const router = express.Router();

const { calculateScore } = require("../scoring/scoring");
const { getGroqResponse, verifyDocumentType, getGroqChatResponse } = require("../groq/groq");

router.post("/", async (req, res) => {
  try {
    const { message, chatHistory, form, schemeId, images } = req.body;
    console.log("Received Chat Request:", { message, schemeId });

    // 1. If images are provided, verify them using AI Vision
    const verifiedDocs = [];
    if (images && Array.isArray(images)) {
      for (const base64Image of images) {
        const verifiedType = await verifyDocumentType(base64Image);
        if (verifiedType !== "Unknown") {
          verifiedDocs.push(verifiedType);
        }
      }
    }

    // 2. Prepare Context for AI
    // We combine the rule-based scoring with the chat message
    const scoreData = calculateScore({ ...form, schemeId, documents: verifiedDocs });
    
    // 3. Get Conversational AI Response
    const aiResponse = await getGroqChatResponse({
      message,
      chatHistory,
      scoreData,
      schemeId
    });

    // 4. Merge AI-extracted data back into form for next turn
    const updatedForm = {
      ...form,
      ...(aiResponse.extractedData || {})
    };
    
    // Remove nulls from updated form
    Object.keys(updatedForm).forEach(key => {
      if (updatedForm[key] === null || updatedForm[key] === "null") {
        delete updatedForm[key];
      }
    });

    // 5. Final Recalculation with new data
    const finalScoreData = calculateScore({ ...updatedForm, schemeId, documents: verifiedDocs });

    res.json({
      ...finalScoreData,
      ai: aiResponse,
      userData: updatedForm // Send updated form back to frontend
    });
  } catch (error) {
    console.error("Backend Error in /check:", error.message);
    res.status(500).json({ error: "Internal Server Error", message: error.message });
  }
});

module.exports = router;