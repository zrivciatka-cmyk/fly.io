const crypto = require("crypto");
const express = require('express');

const app = express();
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', '*');
    if (req.method === 'OPTIONS') return res.sendStatus(200);
    next();
});

function hash(alg, s) {
    const a = String(alg || "SHA-256").toLowerCase().replace(/[^a-z0-9]/g, "");
    return crypto.createHash(a).update(String(s)).digest("hex");
}

function solve(c) {
    const tgt = String(c.challenge).toLowerCase();
    const s = String(c.salt);
    const mx = Math.min(Number(c.maxnumber) || 500000, 500000);
    for (let n = 0; n <= mx; n++) {
        if (hash(c.algorithm, s + n) === tgt) return n;
    }
    return null;
}

async function generator() {
    const opts = {
        headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36" }
    };
    const r = await fetch("https://api.moomoo.io/verify", opts);
    if (!r.ok) return null;
    const c = await r.json();
    const n = solve(c);
    if (n === null) return null;
    return Buffer.from(JSON.stringify({
        algorithm: c.algorithm,
        challenge: c.challenge,
        number: n,
        salt: c.salt,
        signature: c.signature
    })).toString("base64");
}

async function servers(url) {
    try {
        const opts = {
            headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36" }
        };
        const r = await fetch(url, opts);
        if (!r.ok) return [];
        const data = await r.text();
        return data;
    } catch (e) {
        console.log(`✗ Failed to fetch moomoo.io servers:`, e.message);
        return [];
    }
}

app.get('/token', async (req, res) => {
    let txt = await generator();
    res.send(txt)
});
// https://api.moomoo.io/servers?v=1.26
app.get('/servers', async (req, res) => {
    let txt = await servers(req.query?.url);
    res.send(txt)
});

app.listen(3000, () => {
    console.log('Server running on port http://localhost:3000');
});