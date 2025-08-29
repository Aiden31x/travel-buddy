import { callGroq, validateRequiredFields } from "@/app/lib/groq";

export async function POST(req: Request) {
  const body = await req.json();
  const requiredFields = ["destination", "lat", "lon", "dates", "budget", "interests"];
  const missingFields = validateRequiredFields(body, requiredFields);
  
  if (missingFields.length > 0) {
    return new Response(
      JSON.stringify({ error: `Missing fields: ${missingFields.join(", ")}` }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  // 🔌 1. Fetch raw nearby data from your existing endpoint
  const nearbyUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/api/places/nearby?lat=${lat}&lon=${lon}&radius=3000&category=tourist_attractions&limit=30`;
  const nearbyRes = await fetch(nearbyUrl);
  const nearbyData = await nearbyRes.json();

  // 🔌 2. Create the LLM prompt
  const systemPrompt = `You are a helpful travel planner. 
Use the following nearby places data (from OpenStreetMap) to create a personalized trip plan.
Make sure your output is structured and easy to use.`;

  const userPrompt = `
Destination: ${body.destination}
Dates: ${body.dates}
Budget: ${body.budget || "Not specified"}
Interests: ${body.interests?.join(", ") || "Not specified"}

Nearby places data:
${JSON.stringify(nearbyData.places, null, 2)}

Please create a suggested trip plan. Include key highlights, must-see places, and reasoning.
  `;

  // 🔌 3. Call Groq
  const llmResponse = await callGroq([
    { role: "system", content: systemPrompt },
    { role: "user", content: userPrompt }
  ]);

  return new Response(JSON.stringify({ plan: llmResponse.choices[0].message.content }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}
