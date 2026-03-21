const axios = require("axios");
const sharp = require("sharp"); // You will need to install this: npm install sharp

// New function to verify document type using Vision AI
async function verifyDocumentType(base64Image) {
  try {
    // 1. Resize and compress the image to ensure it's within Groq's limits
    const imageBuffer = Buffer.from(base64Image, 'base64');
    const compressedBuffer = await sharp(imageBuffer)
      .resize(800) // Resize to a max width of 800px
      .jpeg({ quality: 70 }) // Compress to 70% quality
      .toBuffer();
    
    const compressedBase64 = compressedBuffer.toString('base64');

    const res = await axios.post(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        model: "meta-llama/llama-4-scout-17b-16e-instruct",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: "Identify this document. Is it an Aadhar Card, Income Certificate, Address Proof, or a Resume? Respond with ONLY the name of the document. If it's none of these, respond with 'Unknown'." },
              { type: "image_url", image_url: { url: `data:image/jpeg;base64,${compressedBase64}` } }
            ]
          }
        ]
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );
    return res.data.choices[0].message.content.trim();
  } catch (error) {
    console.error("Vision API Error:", error.response?.data || error.message);
    return "Unknown";
  }
}

async function getGroqResponse(scoreData) {
  const prompt = `
  User Data: ${JSON.stringify(scoreData.userData)}
  Score: ${scoreData.score}
  Issues: ${JSON.stringify(scoreData.issues)}
  Missing Documents: ${JSON.stringify(scoreData.missingDocuments)}

  Task: Explain why application may be rejected, list improvements required, and provide actionable steps.
  Output Format: Strictly return structured JSON:
  {
    "summary": "...",
    "risks": ["...", "..."],
    "improvements": ["...", "..."],
    "eligibilityStatus": "Low/Medium/High"
  }
  `;

  try {
    const res = await axios.post(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    return JSON.parse(res.data.choices[0].message.content);
  } catch (error) {
    console.error("Groq API Error:", error.response?.data || error.message);
    return {
      summary: "Error generating AI analysis.",
      risks: [],
      improvements: [],
      eligibilityStatus: "Unknown",
    };
  }
}

module.exports = { getGroqResponse, verifyDocumentType };