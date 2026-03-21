function calculateScore(data) {
  let score = 100;
  const issues = [];
  const missingDocuments = [];
  const schemeId = data.schemeId || "general";

  // 1. Basic Eligibility Validation (Universal)
  if (!data.age || data.age < 1) {
    score -= 10;
    issues.push("Age information is invalid or missing");
  }

  if (!data.occupation) {
    score -= 10;
    issues.push("Occupation field is missing");
  }

  if (!data.location) {
    score -= 10;
    issues.push("Location field is missing");
  }

  // 2. Scheme-Specific Rules (Deterministic Scoring)
  const schemeRules = {
    scholarship: {
      maxAge: 25,
      maxIncome: 200000,
      requiredOccupation: ["student"],
      docs: ["ID Proof", "Income Certificate"]
    },
    farmer: {
      minAge: 18,
      maxIncome: 300000,
      requiredOccupation: ["farmer", "agriculture"],
      docs: ["ID Proof", "Land Records", "Income Certificate"]
    },
    employment: {
      minAge: 18,
      maxAge: 45,
      maxIncome: 150000,
      docs: [ "Resume"]
    },
    health: {
      maxIncome: 500000,
      docs: ["ID Proof", "Address Proof", "Health Card"]
    }
  };

  const rule = schemeRules[schemeId] || { docs: ["ID Proof", "Address Proof"] };

  // Age Check
  if (rule.minAge && data.age < rule.minAge) {
    score -= 20;
    issues.push(`Minimum age for this scheme is ${rule.minAge}`);
  }
  if (rule.maxAge && data.age > rule.maxAge) {
    score -= 20;
    issues.push(`Maximum age for this scheme is ${rule.maxAge}`);
  }

  // Income Check
  if (rule.maxIncome && Number(data.income) > rule.maxIncome) {
    score -= 30;
    issues.push(`Income exceeds the threshold of ${rule.maxIncome} for this scheme`);
  }

  // Occupation Check
  if (rule.requiredOccupation) {
    const userOcc = (data.occupation || "").toLowerCase();
    const isOccValid = rule.requiredOccupation.some(occ => userOcc.includes(occ));
    if (!isOccValid) {
      score -= 15;
      issues.push(`Occupation '${data.occupation}' may not be eligible for this scheme`);
    }
  }

  // 3. Document Presence Validation (AI Verified)
  const uploadedDocs = (data.documents || []).map(d => d.toLowerCase());
  const docKeywords = {
    "ID Proof": ["aadhar", "id proof", "identity", "pan card", "voter id"],
    "Income Certificate": ["income certificate", "salary", "pay slip", "tax"],
    "Address Proof": ["address proof", "passport", "bill", "rent agreement"],
    "Land Records": ["land", "property", "khata"],
    "Resume": ["resume", "cv", "experience"],
    "Health Card": ["health", "medical", "insurance"]
  };

  rule.docs.forEach(docKey => {
    const keywords = docKeywords[docKey] || [docKey.toLowerCase()];
    const isFound = uploadedDocs.some(uploaded => 
      keywords.some(kw => uploaded.includes(kw)) || uploaded.includes(docKey.toLowerCase())
    );

    if (!isFound) {
      score -= 15;
      missingDocuments.push(docKey);
      issues.push(`Missing required document: ${docKey}`);
    }
  });

  // Ensure score doesn't go below 0
  score = Math.max(0, score);

  return {
    score,
    issues,
    missingDocuments,
    schemeId,
    userData: {
      age: data.age,
      income: data.income,
      occupation: data.occupation,
      location: data.location
    }
  };
}

module.exports = { calculateScore };