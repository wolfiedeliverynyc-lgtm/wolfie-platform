import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

export const runtime = 'nodejs';

// Pre-curated high-quality Unsplash food images
const IMAGE_POOL = {
  ramen: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&w=400&h=300&q=80',
  pizza: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=400&h=300&q=80',
  burger: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=400&h=300&q=80',
  sushi: 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?auto=format&fit=crop&w=400&h=300&q=80',
  steak: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=400&h=300&q=80',
  salad: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=400&h=300&q=80',
  pasta: 'https://images.unsplash.com/photo-1546549032-9571cd6b27df?auto=format&fit=crop&w=400&h=300&q=80',
  dessert: 'https://images.unsplash.com/photo-1563805042-7684c019e1cb?auto=format&fit=crop&w=400&h=300&q=80',
  tacos: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=400&h=300&q=80',
  beverage: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=400&h=300&q=80',
  seafood: 'https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?auto=format&fit=crop&w=400&h=300&q=80',
  breakfast: 'https://images.unsplash.com/photo-1533089860862-a5a2cc02a5cf?auto=format&fit=crop&w=400&h=300&q=80'
};

export async function POST(req: NextRequest) {
  try {
    const { prompt } = await req.json();
    if (!prompt) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'Gemini API key is not configured' }, { status: 500 });
    }

    const ai = new GoogleGenAI({ apiKey });
    
    const systemPrompt = `
You are a master culinary director. Your task is to generate a custom menu of 4 to 6 premium menu items for a restaurant with this description: "${prompt}".

You MUST return a JSON array containing MenuItem objects. Do not wrap it in markdown code blocks or add any text. Just pure JSON.
Each MenuItem must have:
- "id": a unique string (e.g. "gen_m1", "gen_m2")
- "name": name of the dish
- "description": descriptive explanation detailing the taste profile
- "price": reasonable numeric price (e.g. 16.50)
- "category": name of its food category (e.g. "Main Plates", "Appetizers")
- "image": choose the closest match URL string from this pool of working Unsplash links:
  ${JSON.stringify(IMAGE_POOL)}
- "isPopular": boolean (set true for 1 or 2 items)
- "isVegetarian": boolean (set true if appropriate)
`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: systemPrompt,
    });

    const text = response.text || '';
    
    // Clean up text if the model wrapped it in ```json
    const cleanedText = text.replace(/```json/i, '').replace(/```/g, '').trim();
    
    try {
      const menu = JSON.parse(cleanedText);
      return NextResponse.json({ menu });
    } catch (e) {
      console.error('Failed to parse Gemini output:', text, e);
      return NextResponse.json({ error: 'Invalid response format from Gemini', raw: text }, { status: 500 });
    }

  } catch (error: any) {
    console.error('Error generating menu:', error);
    return NextResponse.json({ error: error?.message || 'Server error generating menu' }, { status: 500 });
  }
}
