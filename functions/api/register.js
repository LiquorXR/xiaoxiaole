export async function onRequestPost(context) {
    const { request, env } = context;
    const { username, password } = await request.json();

    if (!username || !password) {
        return new Response(JSON.stringify({ error: "账号和密码不能为空" }), { status: 400 });
    }

    try {
        // 检查用户是否存在
        const existing = await env.xiaoxiaole.prepare("SELECT username FROM users WHERE username = ?")
            .bind(username)
            .first();

        if (existing) {
            return new Response(JSON.stringify({ error: "该昵称已被占用" }), { status: 409 });
        }

        // 插入新用户 (实际生产环境建议对密码进行 hash，如使用 Web Crypto API)
        await env.xiaoxiaole.prepare("INSERT INTO users (username, password) VALUES (?, ?)")
            .bind(username, password)
            .run();

        // 初始化游戏进度
        await env.xiaoxiaole.prepare("INSERT INTO user_progress (username, level, total_score) VALUES (?, 1, 0)")
            .bind(username)
            .run();

        return new Response(JSON.stringify({ success: true, message: "注册成功" }), {
            headers: { "Content-Type": "application/json" }
        });
    } catch (e) {
        return new Response(JSON.stringify({ error: "服务器内部错误: " + e.message }), { status: 500 });
    }
}
