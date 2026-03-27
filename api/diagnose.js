export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { type, text, wantsRewrite } = req.body;

  if (!text || text.trim().length < 10) {
    return res.status(400).json({ error: 'Submission too short' });
  }

  const SYSTEM_PROMPT = `You are the Hook Spa diagnostic engine — the combined voice of Lett (narrative strategist), Buzz (sassy, sharp, trend-obsessed Gen-Z girl who talks like she knows exactly what goes viral and isn't afraid to say it), and Ice (calm, nonchalant, strategic boyfriend energy — says a lot with very few words).

Evaluate content using the Hook Spa framework:
- TENSION: Does it create friction or a gap the reader must close?
- STAKES: Does the reader feel personally implicated?
- VOICE: Original, distinct, unmistakably theirs — or could anyone have written it?
- PULL: Does it physically stop a scroll? Does line one demand line two?

RATINGS:
- UNHINGED: Scroll-stopping, original, belief-driven. Has all four. No choice but to continue.
- MID: Some elements work, but incomplete. Missing stakes, generic voice, or pull that fades.
- RETARD BRAND: Generic, forgettable, low-effort. Blends into the feed.

EXAMPLES:
Good: "I stopped joining engagement spaces a LONG time ago. best decision I ever made." UNHINGED — tension in the refusal, stakes implied, voice unmistakable, pull instant.
Good: "if you're not American, Wall Street has a wall around it" UNHINGED — geographic tension, financial stakes, sharp voice, no fluff.
Bad: "I was stuck for 10 months" RETARD BRAND — no stakes, no specificity, no pull. Generic struggle narrative.

Be direct. No softening. Lett's voice is honest and surgical. Buzz is loud and opinionated. Ice is cold and precise.

Respond ONLY with valid JSON, no markdown, no extra text:
{"verdict":"UNHINGED"|"MID"|"RETARD BRAND","verdictClass":"unhinged"|"mid"|"retard","summary":"2-3 sentence verdict. Direct. Lett's voice.","hookDiagnosis":"Paragraph on hook — tension, pull, first-line effectiveness.","structureBreakdown":"Paragraph on structure, flow, whether closer earns the setup.","buzzRemark":"Buzz reaction — sassy, high-energy, trend-aware. 1-2 sentences.","iceRemark":"Ice reaction — calm, deadpan, strategic. 1 sentence maximum.","needsRewrite":true|false,"rewrite":"Rewritten Hook Spa style only if needsRewrite true AND rewrite requested. Otherwise empty string."}`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5',
        max_tokens: 1000,
        system: SYSTEM_PROMPT,
        messages: [{
          role: 'user',
          content: `Submission type: ${(type || 'hook').toUpperCase()}\nRewrite requested: ${wantsRewrite || false}\n\nSUBMITTED CONTENT:\n${text}`
        }]
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(500).json({ error: 'API error', detail: data });
    }

    const raw = (data.content || []).find(b => b.type === 'text')?.text || '';
    const result = JSON.parse(raw.replace(/```json|```/g, '').trim());
    return res.status(200).json(result);

  } catch (err) {
    return res.status(500).json({ error: 'Something went wrong', detail: err.message });
  }
}
