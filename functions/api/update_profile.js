export async function onRequestPost(context) {
    const { request, env } = context;
    
    try {
        const body = await request.json();
        const { oldUsername, newUsername, newPassword } = body;

        if (!oldUsername || !newUsername) {
            return new Response(JSON.stringify({ error: "请求参数不完整" }), { 
                status: 400,
                headers: { "Content-Type": "application/json" }
            });
        }

        // 1. 获取旧用户完整信息
        const user = await env.xiaoxiaole.prepare("SELECT * FROM users WHERE username = ?")
            .bind(oldUsername)
            .first();
            
        if (!user) {
            return new Response(JSON.stringify({ error: `未找到用户: ${oldUsername}` }), { 
                status: 404,
                headers: { "Content-Type": "application/json" }
            });
        }

        // 2. 如果用户名没变，只需更新密码
        if (oldUsername === newUsername) {
            if (newPassword && newPassword.trim() !== "") {
                await env.xiaoxiaole.prepare("UPDATE users SET password = ? WHERE username = ?")
                    .bind(newPassword, oldUsername)
                    .run();
                return new Response(JSON.stringify({ success: true, message: "密码修改成功" }), {
                    headers: { "Content-Type": "application/json" }
                });
            } else {
                return new Response(JSON.stringify({ success: true, message: "未做任何修改" }), {
                    headers: { "Content-Type": "application/json" }
                });
            }
        }

        // 3. 修改了用户名的情况
        // 3.1 检查新用户名是否已被占用
        const existing = await env.xiaoxiaole.prepare("SELECT username FROM users WHERE username = ?")
            .bind(newUsername)
            .first();
        if (existing) {
            return new Response(JSON.stringify({ error: "该新昵称已被占用" }), { 
                status: 400,
                headers: { "Content-Type": "application/json" }
            });
        }

        // 3.2 使用“插入-更新-删除”策略绕过外键约束
        const passwordToUse = (newPassword && newPassword.trim() !== "") ? newPassword : user.password;
        
        await env.xiaoxiaole.batch([
            // 创建新用户记录
            env.xiaoxiaole.prepare("INSERT INTO users (username, password, created_at) VALUES (?, ?, ?)")
                .bind(newUsername, passwordToUse, user.created_at),
            // 将进度关联到新用户名
            env.xiaoxiaole.prepare("UPDATE user_progress SET username = ? WHERE username = ?")
                .bind(newUsername, oldUsername),
            // 删除旧用户记录
            env.xiaoxiaole.prepare("DELETE FROM users WHERE username = ?")
                .bind(oldUsername)
        ]);

        return new Response(JSON.stringify({ 
            success: true,
            message: "用户信息修改成功" 
        }), {
            headers: { "Content-Type": "application/json" }
        });
    } catch (e) {
        return new Response(JSON.stringify({ 
            error: "操作失败", 
            message: e.message,
            details: "在尝试更新用户名时发生错误"
        }), { 
            status: 500,
            headers: { "Content-Type": "application/json" }
        });
    }
}
