import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextResponse } from 'next/server';

export async function POST(req) {
  try {
    if (!(req.headers.get('x-gemini-key') || request?.headers?.get('x-gemini-key') || process.env.GEMINI_API_KEY)) throw new Error("API Key missing");
    
    const body = await req.json();
    const { prompt, modelChoice, imageBase64 } = body;
    
    const genAI = new GoogleGenerativeAI((req.headers.get('x-gemini-key') || request?.headers?.get('x-gemini-key') || process.env.GEMINI_API_KEY));
    
    let modelsToTry = [];
    if (modelChoice === 'pro') {
      // If they choose Pro, try heavy models first, but fallback to Flash as safety net protecting free-tier keys
      modelsToTry = ["gemini-2.5-pro", "gemini-1.5-pro-latest", "gemini-pro-latest", "gemini-2.5-flash", "gemini-flash-latest"];
    } else {
      modelsToTry = ["gemini-2.5-flash", "gemini-3.5-flash", "gemini-flash-latest"];
    }

    const contents = [{ text: prompt }];

    if (imageBase64) {
      const match = imageBase64.match(/^data:(image\/\w+);base64,(.*)$/);
      if (match) {
        contents.push({
          inlineData: { mimeType: match[1], data: match[2] }
        });
      }
    }
    
    let result = null;
    let lastError = null;
    let usedModel = '';

    for (const modelName of modelsToTry) {
        try {
            console.log("Chat routing to:", modelName);
            const model = genAI.getGenerativeModel({ model: modelName });
            result = await model.generateContent(contents);
            usedModel = modelName;
            break;
        } catch (err) {
            console.warn(`Model ${modelName} failed. Falling back...`);
            lastError = err;
        }
    }

    if (!result) {
       if (lastError?.message?.includes("quota") || lastError?.message?.includes("token")) {
           throw new Error("API Key does not have billing quota for this model. Switch to Flash Mode!");
       }
       throw new Error(lastError ? lastError.message : "All configured models failed.");
    }
    
    let finalResponse = result.response.text();

    // If the user requested Pro but we had to fallback to Flash because of free-tier quotas:
    if (modelChoice === 'pro' && usedModel.includes('flash')) {
       finalResponse = `*(⚠️ Note: Your API key does not have free-tier access to 'Pro', so Google automatically compiled this securely using 'Flash' instead!)*\n\n` + finalResponse;
    }

    return NextResponse.json({ response: finalResponse }, { status: 200 });
  } catch (error) {
    console.error("Chat API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
