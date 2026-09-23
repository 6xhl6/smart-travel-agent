export const streamResponse = (res) => {
    // 设置响应状态码为200
    res.status(200)
    // 设置响应头，确保客户端支持流式传输
    res.set({
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no'
    })
    // 立即将响应头写入socket，确保客户端立即收到响应
    res.flushHeaders()

    const write = (data) => {
        if (res.destroyed || res.writableEnded) {
            return false
        }
        return res.write(`data: ${JSON.stringify(data)}\n\n`)
    }

    return {
        send: write,
        end: (data) => {
            if (!res.destroyed && !res.writableEnded) {
                write({ type: 'complete', data })
                res.end()
            }
        },
        error: (error) => {
            if (!res.destroyed && !res.writableEnded) {
                write({
                    type: 'error',
                    msg: error.message || '模型服务调用失败'
                })
                res.end()
            }
        }
    }
}
