export async function onRequestPost(context) {
    const { request, env } = context;
    const { username, password } = await request.json();

    try {
        const user = await env.xiaoxiaole.prepare("SELECT * FROM users WHERE username = ?")
            .bind(username)
            .first();

        if (!user || user.password !== password) {
            return new Response(JSON.stringify({ error: "账号或密码错误" }), { status: 401 });
        }

        // 获取用户进度
        const progress = await env.xiaoxiaole.prepare("SELECT level, total_score FROM user_progress WHERE username = ?")
            .bind(username)
            .first();

        return new Response(JSON.stringify({
            success: true,
            user: {
                username: user.username,
                progress: progress || { level: 1, total_score: 0 }
            }
        }), {
            headers: { "Content-Type": "application/json" }
        });
    } catch (e) {
        return new Response(JSON.stringify({ error: "登录失败: " + e.message }), { status: 500 });
    }
}
