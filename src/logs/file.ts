import fs from 'fs';

export function createFileLogger(filepath: string, separator = '\n', options: { expireDuration?: number; ttl?: number } = {}) {
    const logWriteStream = fs.createWriteStream(filepath, { flags: 'a' });
    function appendLog(log: string) {
        logWriteStream.write(log + separator);
    }
    function onInterval() {
        if (!fs.existsSync(filepath)) return;
        const currentTime = Date.now();
        appendLog(` ---------- TIMESTAMP: ${currentTime} ---------- `);
        const expiryTimestamp = Date.now() - (options.ttl || 0) * 1000;
        let chunk = fs.readFileSync(filepath).toString();
        let match;
        while ((match = /-----------TIMESTAMP: (\d+) ----------/g.exec(chunk)) !== null) {
            const timestamp = parseInt(match[1], 10);
            if (timestamp > expiryTimestamp) {
                chunk = chunk.substring(match.index);
                break;
            } else {
                chunk = chunk.substring(match.index + match[0].length);
            }
        }
        fs.writeFileSync(filepath, chunk);
    }
    if (options.expireDuration && fs.existsSync(filepath)) {
        const stats = fs.statSync(filepath);
        const life = (Date.now() - stats.birthtime.getTime()) / 1000;
        if (life > options.expireDuration) {
            fs.rmSync(filepath);
        }
    }
    if (options.ttl) {
        setInterval(onInterval, 60 * 1000);
        onInterval();
    }
    return appendLog;
}
