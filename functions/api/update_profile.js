export async function onRequestPost(context) {
    const { request, env } = context;
    const { oldUsername, newUsername, newPassword } = await request.json();

    if (!oldUsername || !newUsername) {
        return new Response(JSON.stringify({ error: "参数不足" }), { status: 400 });
    }

    try {
        // 1. 开启事务 (D1 暂不支持显式事务 onRequest 作用域，我们按顺序执行)
        
        // 如果修改了用户名，检查新用户名是否已存在
        if (oldUsername !== newUsername) {
            const existing = await env.xiaoxiaole.prepare("SELECT username FROM users WHERE username = ?")
                .bind(newUsername)
                .first();
            if (existing) {
                return new Response(JSON.stringify({ error: "新昵称已被占用" }), { status: 400 });
            }
        }

        // 2. 更新用户信息
        let userQuery = "UPDATE users SET username = ?";
        let params = [newUsername];
        if (newPassword && newPassword.trim() !== "") {
            userQuery += ", password = ?";
            params.push(newPassword);
        }
        userQuery += " WHERE username = ?";
        params.push(oldUsername);

        await env.xiaoxiaole.prepare(userQuery).bind(...params).run();

        // 3. 如果用户名变了，同步更新进度表和排行榜（如果有外键联级则不需要，但为了稳妥手动更新）
        if (oldUsername !== newUsername) {
            await env.xiaoxiaole.prepare("UPDATE user_progress SET username = ? WHERE username = ?")
                .bind(newUsername, oldUsername)
                .run();
        }

        return new Response(JSON.stringify({ success: true }), {
            headers: { "Content-Type": "application/json" }
        });
    } catch (e) {
        return new Response(JSON.stringify({ error: "更新失败: " + e.message }), { status: 500 });
    }
}
