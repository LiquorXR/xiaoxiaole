export async function onRequestPost(context) {
    const { request, env } = context;
    
    try {
        const { oldUsername, newUsername, newPassword } = await request.json();

        if (!oldUsername || !newUsername) {
            return new Response(JSON.stringify({ error: "参数不足" }), { status: 400 });
        }

        // 1. 检查旧用户是否存在
        const user = await env.xiaoxiaole.prepare("SELECT username FROM users WHERE username = ?")
            .bind(oldUsername)
            .first();
            
        if (!user) {
            return new Response(JSON.stringify({ error: "用户不存在" }), { status: 404 });
        }

        // 2. 如果修改了用户名，检查新用户名是否已存在
        if (oldUsername !== newUsername) {
            const existing = await env.xiaoxiaole.prepare("SELECT username FROM users WHERE username = ?")
                .bind(newUsername)
                .first();
            if (existing) {
                return new Response(JSON.stringify({ error: "新昵称已被占用" }), { status: 400 });
            }
        }

        // 3. 准备批处理更新
        const batch = [];
        
        // 更新用户信息
        let userQuery = "UPDATE users SET username = ?";
        let userParams = [newUsername];
        if (newPassword && newPassword.trim() !== "") {
            userQuery += ", password = ?";
            userParams.push(newPassword);
        }
        userQuery += " WHERE username = ?";
        userParams.push(oldUsername);
        
        batch.push(env.xiaoxiaole.prepare(userQuery).bind(...userParams));

        // 如果用户名变了，同步更新进度表
        if (oldUsername !== newUsername) {
            batch.push(env.xiaoxiaole.prepare("UPDATE user_progress SET username = ? WHERE username = ?")
                .bind(newUsername, oldUsername));
        }

        // 执行批处理
        const results = await env.xiaoxiaole.batch(batch);
        
        // 检查更新是否成功
        if (results[0].meta.changes === 0) {
            return new Response(JSON.stringify({ error: "更新失败，未找到匹配用户" }), { status: 400 });
        }

        return new Response(JSON.stringify({ 
            success: true,
            message: "资料更新成功" 
        }), {
            headers: { "Content-Type": "application/json" }
        });
    } catch (e) {
        return new Response(JSON.stringify({ error: "服务器内部错误: " + e.message }), { status: 500 });
    }
}
