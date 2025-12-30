export async function onRequestGet(context) {
    const { env } = context;

    try {
        const ranks = await env.xiaoxiaole.prepare(`
            SELECT username as name, level, total_score as score
            FROM user_progress
            ORDER BY level DESC, total_score DESC
            LIMIT 10
        `).all();

        return new Response(JSON.stringify(ranks.results), {
            headers: { "Content-Type": "application/json" }
        });
    } catch (e) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500 });
    }
}
