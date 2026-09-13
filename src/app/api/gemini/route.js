import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextResponse } from 'next/server';

export async function POST(req) {
  try {
    if (!(req.headers.get('x-gemini-key') || request?.headers?.get('x-gemini-key') || process.env.GEMINI_API_KEY)) {
      return NextResponse.json({ error: "GEMINI_API_KEY is not configured in .env.local" }, { status: 400 });
    }

    const genAI = new GoogleGenerativeAI((req.headers.get('x-gemini-key') || request?.headers?.get('x-gemini-key') || process.env.GEMINI_API_KEY));
    const modelsToTry = [
      "gemini-flash-latest",
      "gemini-3.5-flash",
      "gemini-2.5-flash",
      "gemini-pro-latest"
    ];
    
    const formData = await req.formData();
    const images = formData.getAll('images');
    const customPrompt = formData.get('customPrompt');
    
    if (!images || images.length === 0) {
      return NextResponse.json({ error: "No images provided" }, { status: 400 });
    }

    const imageParts = await Promise.all(
      images.map(async (file) => {
        const arrayBuffer = await file.arrayBuffer();
        return {
          inlineData: {
            data: Buffer.from(arrayBuffer).toString("base64"),
            mimeType: file.type
          }
        };
      })
    );

    let systemPrompt = `You are a study assistant analyzing ${images.length} image(s). EVERY image represents a COMPLETELY SEPARATE question.\n`;
    
    if (customPrompt && customPrompt.trim().length > 0) {
      systemPrompt += `\nUSER SPECIFIC INSTRUCTIONS:\n"${customPrompt.trim()}"\n\n`;
    } else {
      systemPrompt += `\nCreate an identifiable question name and a concise summary (max 3 sentences) for each image.\n\n`;
    }

    systemPrompt += `IMPORTANT: Format your response EXACTLY as a strict JSON ARRAY containing EXACTLY ${images.length} objects. Do not wrap it in markdown blockquotes, just pure JSON brackets.
    EXPECTED EXACT FORMAT:
    [
      { "name": "Question 1 Name", "summary": "Detailed summary describing Question 1" },
      { "name": "Question 2 Name", "summary": "Detailed summary describing Question 2" }
    ]`;

    let result = null;
    let lastError = null;

    for (const modelName of modelsToTry) {
        try {
            console.log("Trying Gemini model:", modelName);
            const model = genAI.getGenerativeModel({ model: modelName });
            result = await model.generateContent([systemPrompt, ...imageParts]);
            break; 
        } catch (err) {
            console.warn(`Model ${modelName} failed. Falling back...`);
            lastError = err;
        }
    }

    if (!result) throw new Error(`All models failed. Last error: ${lastError?.message}`);

    const responseText = result.response.text();
    
    // Strip markdown formatting if Gemini included it despite instructions
    const jsonMatch = responseText.match(/```(?:json)?([\s\S]*?)```/) || [null, responseText];
    const jsonStr = jsonMatch[1].trim();
    
    const data = JSON.parse(jsonStr);
    const finalArray = Array.isArray(data) ? data : [data];

    return NextResponse.json(finalArray, { status: 200 });
  } catch(error) {
    console.error("Gemini Server Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
