export async function onRequestPost(context) {
    const { request, env } = context;
    const { username, password, isAutoLogin } = await request.json();

    try {
        const user = await env.xiaoxiaole.prepare("SELECT * FROM users WHERE username = ?")
            .bind(username)
            .first();

        if (!user) {
            return new Response(JSON.stringify({ error: "用户不存在" }), { status: 404 });
        }

        // 如果不是自动登录，则必须校验密码
        if (!isAutoLogin && user.password !== password) {
            return new Response(JSON.stringify({ error: "密码错误" }), { status: 401 });
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
