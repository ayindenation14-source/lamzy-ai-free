exports.handler = async (event) => {
  const headers = {
    "Content-Type": "application/json",
    "Cache-Control": "no-store"
  };

  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: "Use POST to send a message." })
    };
  }

  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return {
      statusCode: 503,
      headers,
      body: JSON.stringify({
        error: "AI setup is not finished. Add OPENAI_API_KEY in Netlify environment variables."
      })
    };
  }

  try {
    const body = JSON.parse(event.body || "{}");
    const messages = (Array.isArray(body.messages) ? body.messages : [])
      .filter(m =>
        m &&
        ["user", "assistant"].includes(m.role) &&
        typeof m.content === "string"
      )
      .slice(-12)
      .map(m => ({
        role: m.role,
        content: m.content.slice(0, 5000)
      }));

    if (!messages.length || messages[messages.length - 1].role !== "user") {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: "Please type a question first." })
      };
    }

    const response = await fetch(
      "https://api.openai.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: process.env.OPENAI_MODEL || "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content: "You are Lamzy AI, a helpful, friendly AI assistant. Answer accurately and explain things clearly."
            },
            ...messages
          ]
        })
      }
    );

    const result = await response.json();

    if (!response.ok) {
      return {
        statusCode: 502,
        headers,
        body: JSON.stringify({
          error: "AI error. Check your API key and available API credit."
        })
      };
    }

    const reply = result.choices?.[0]?.message?.content;

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        reply: reply || "Please try asking again."
      })
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: "Something went wrong. Please try again."
      })
    };
  }
};