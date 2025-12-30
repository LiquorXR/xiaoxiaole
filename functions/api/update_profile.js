export async function onRequestPost(context) {
    const { request, env } = context;
    
    try {
        const body = await request.json();
        const { oldUsername, newUsername, newPassword } = body;

        if (!oldUsername || !newUsername) {
            return new Response(JSON.stringify({ error: "参数不足: oldUsername 或 newUsername 缺失" }), { 
                status: 400,
                headers: { "Content-Type": "application/json" }
            });
        }

        // 1. 检查旧用户是否存在
        const user = await env.xiaoxiaole.prepare("SELECT username FROM users WHERE username = ?")
            .bind(oldUsername)
            .first();
            
        if (!user) {
            return new Response(JSON.stringify({ error: `用户 "${oldUsername}" 不存在` }), { 
                status: 404,
                headers: { "Content-Type": "application/json" }
            });
        }

        // 2. 如果修改了用户名，检查新用户名是否已存在
        if (oldUsername !== newUsername) {
            const existing = await env.xiaoxiaole.prepare("SELECT username FROM users WHERE username = ?")
                .bind(newUsername)
                .first();
            if (existing) {
                return new Response(JSON.stringify({ error: "新昵称已被占用" }), { 
                    status: 400,
                    headers: { "Content-Type": "application/json" }
                });
            }
        }

        // 3. 准备执行更新
        // 由于 Cloudflare D1 的 batch 在处理带有外键关系的更新时可能遇到顺序检查问题，
        // 且默认情况下 D1 的外键检查是禁用的，我们这里使用顺序执行或确保事务正确。
        
        // 更新用户信息
        let userQuery = "UPDATE users SET username = ?";
        let userParams = [newUsername];
        if (newPassword && newPassword.trim() !== "") {
            userQuery += ", password = ?";
            userParams.push(newPassword);
        }
        userQuery += " WHERE username = ?";
        userParams.push(oldUsername);
        
        // 如果用户名没变，只需要更新用户表
        if (oldUsername === newUsername) {
            await env.xiaoxiaole.prepare(userQuery).bind(...userParams).run();
        } else {
            // 如果用户名变了，需要同步更新进度表
            // 使用 batch 确保原子性
            await env.xiaoxiaole.batch([
                env.xiaoxiaole.prepare(userQuery).bind(...userParams),
                env.xiaoxiaole.prepare("UPDATE user_progress SET username = ? WHERE username = ?")
                    .bind(newUsername, oldUsername)
            ]);
        }

        return new Response(JSON.stringify({ 
            success: true,
            message: "资料更新成功" 
        }), {
            headers: { "Content-Type": "application/json" }
        });
    } catch (e) {
        return new Response(JSON.stringify({ 
            error: "服务器内部错误", 
            details: e.message,
            stack: e.stack
        }), { 
            status: 500,
            headers: { "Content-Type": "application/json" }
        });
    }
}
