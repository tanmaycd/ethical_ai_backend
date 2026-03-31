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

async function getGroqChatResponse({ message, chatHistory, scoreData, schemeId }) {
  const context = `
    You are an AI Government Scheme Readiness Advisor. 
    The user is applying for the scheme: ${schemeId}.
    Current Rule-Based Score: ${scoreData.score}/100.
    Current Issues: ${JSON.stringify(scoreData.issues)}.
    Current Data: ${JSON.stringify(scoreData.userData)}.

    Instructions:
    1. Be conversational and helpful.
    2. If the user provides new info (like age or income), acknowledge it.
    3. Explain their readiness and what documents or eligibility criteria they are missing.
    4. If they upload a document, tell them if it's verified or not.
    
    Format your response in structured JSON:
    {
      "reply": "Your conversational message to the user",
      "summary": "Brief summary of status",
      "risks": ["risk 1", "risk 2"],
      "improvements": ["step 1", "step 2"],
      "eligibilityStatus": "Low/Medium/High",
      "extractedData": {
        "age": "number or null",
        "income": "number or null",
        "occupation": "string or null",
        "location": "string or null"
      }
    }
  `;

  try {
    const messages = [
      { role: "system", content: context },
      ...(chatHistory || []).map(m => ({ role: m.role, content: m.content })),
      { role: "user", content: message || "Can you check my readiness for this scheme?" }
    ];

    const res = await axios.post(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        model: "llama-3.3-70b-versatile",
        messages,
        response_format: { type: "json_object" },
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    const content = res.data.choices[0]?.message?.content;
    return JSON.parse(content);
  } catch (error) {
    console.error("Groq Chat Error:", error.message);
    return {
      reply: "I'm having trouble connecting. Can you please try again?",
      summary: "Error in AI processing.",
      risks: [],
      improvements: [],
      eligibilityStatus: "Unknown"
    };
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

module.exports = { getGroqResponse, verifyDocumentType, getGroqChatResponse };