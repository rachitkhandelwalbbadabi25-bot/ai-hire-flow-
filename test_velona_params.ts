import dotenv from 'dotenv';
dotenv.config();

async function testPrompt(name: string, payload: any) {
  const apiKey = process.env.VELONA_API_KEY || 'sk-velona-aihireflow-prod-2026-9f8e7d6c5b4a';
  const start = Date.now();
  try {
    const res = await fetch("https://velona.in/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "z-ai/glm-5.3-flash",
        ...payload
      })
    });
    const elapsed = Date.now() - start;
    const text = await res.text();
    let json: any = {};
    try { json = JSON.parse(text); } catch {}
    const choice = json.choices?.[0];
    console.log(`[${name}] Status: ${res.status}, Time: ${elapsed}ms, Finish: ${choice?.finish_reason}, TotalTokens: ${json.usage?.total_tokens}, CompletionTokens: ${json.usage?.completion_tokens}, OutputLength: ${choice?.message?.content?.length}`);
    if (choice?.message?.reasoning_content) {
      console.log(`[${name}] Has reasoning_content: ${choice.message.reasoning_content.length} chars`);
    }
  } catch (err: any) {
    console.log(`[${name}] Error: ${err.message}`);
  }
}

async function run() {
  // Test 1: Standard short prompt
  await testPrompt("standard", {
    messages: [{ role: "user", content: "Output JSON with { score: 85, status: 'ok' }" }],
    max_tokens: 500
  });

  // Test 2: With thinking: { type: "disabled" }
  await testPrompt("thinking_disabled", {
    messages: [{ role: "user", content: "Output JSON with { score: 85, status: 'ok' }" }],
    thinking: { type: "disabled" },
    max_tokens: 500
  });

  // Test 3: With enable_thinking: false
  await testPrompt("enable_thinking_false", {
    messages: [{ role: "user", content: "Output JSON with { score: 85, status: 'ok' }" }],
    enable_thinking: false,
    max_tokens: 500
  });
}

run();
