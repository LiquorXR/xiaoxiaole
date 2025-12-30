export async function onRequestPost(context) {
    const { request, env } = context;
    const { username, level, score } = await request.json();

    if (!username) return new Response("Missing username", { status: 400 });

    try {
        await env.xiaoxiaole.prepare(`
            INSERT INTO user_progress (username, level, total_score, updated_at)
            VALUES (?, ?, ?, CURRENT_TIMESTAMP)
            ON CONFLICT(username) DO UPDATE SET 
                level = excluded.level,
                total_score = excluded.total_score,
                updated_at = CURRENT_TIMESTAMP
        `)
        .bind(username, level, score)
        .run();

        return new Response(JSON.stringify({ success: true }), {
            headers: { "Content-Type": "application/json" }
        });
    } catch (e) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500 });
    }
}
