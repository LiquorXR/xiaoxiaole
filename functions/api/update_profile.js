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

        // 1. 检查旧用户是否存在
        const user = await env.xiaoxiaole.prepare("SELECT username FROM users WHERE username = ?")
            .bind(oldUsername)
            .first();
            
        if (!user) {
            return new Response(JSON.stringify({ error: `未找到用户: ${oldUsername}` }), { 
                status: 404,
                headers: { "Content-Type": "application/json" }
            });
        }

        // 2. 准备 SQL
        const hasPassword = newPassword && newPassword.trim() !== "";
        let userQuery, userParams;

        if (hasPassword) {
            userQuery = "UPDATE users SET username = ?, password = ? WHERE username = ?";
            userParams = [newUsername, newPassword, oldUsername];
        } else {
            userQuery = "UPDATE users SET username = ? WHERE username = ?";
            userParams = [newUsername, oldUsername];
        }

        // 3. 执行更新
        if (oldUsername === newUsername) {
            // 仅修改密码或未做改动
            await env.xiaoxiaole.prepare(userQuery).bind(...userParams).run();
        } else {
            // 修改了用户名，需要考虑外键约束
            // 检查新用户名是否冲突
            const existing = await env.xiaoxiaole.prepare("SELECT username FROM users WHERE username = ?")
                .bind(newUsername)
                .first();
            if (existing) {
                return new Response(JSON.stringify({ error: "该新昵称已被其他玩家占用" }), { 
                    status: 400,
                    headers: { "Content-Type": "application/json" }
                });
            }

            // 使用 batch 执行，并尝试临时关闭外键约束（如果已开启）
            // 注意：D1 的 batch 会在同一个事务中运行
            await env.xiaoxiaole.batch([
                env.xiaoxiaole.prepare("PRAGMA foreign_keys = OFF"),
                env.xiaoxiaole.prepare(userQuery).bind(...userParams),
                env.xiaoxiaole.prepare("UPDATE user_progress SET username = ? WHERE username = ?").bind(newUsername, oldUsername),
                env.xiaoxiaole.prepare("PRAGMA foreign_keys = ON")
            ]);
        }

        return new Response(JSON.stringify({ 
            success: true,
            message: "修改成功" 
        }), {
            headers: { "Content-Type": "application/json" }
        });
    } catch (e) {
        // 返回详细错误信息以供调试
        return new Response(JSON.stringify({ 
            error: "操作失败", 
            message: e.message,
            stack: e.stack 
        }), { 
            status: 500,
            headers: { "Content-Type": "application/json" }
        });
    }
}
