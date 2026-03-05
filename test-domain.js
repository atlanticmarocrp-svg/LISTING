import axios from 'axios';

async function test(cfxId) {
    console.log(`Testing CFX ID: ${cfxId}...`);
    try {
        const response = await axios.get(`https://frontend.cfx-services.net/api/servers/single/${cfxId}`, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
                'Accept': 'application/json, text/plain, */*',
                'Accept-Language': 'en-US,en;q=0.9'
            },
            timeout: 10000
        });
        console.log(`[${cfxId}] Content keys:`, Object.keys(response.data));
        if (response.data.Data) {
            console.log(`[${cfxId}] Data keys:`, Object.keys(response.data.Data));
            console.log(`[${cfxId}] Clients:`, response.data.Data.clients);
            console.log(`[${cfxId}] Max Clients:`, response.data.Data.sv_maxclients);
        } else {
            console.log(`[${cfxId}] clients:`, response.data.clients);
            console.log(`[${cfxId}] sv_maxclients:`, response.data.sv_maxclients);
        }
    } catch (error) {
        console.log(`[${cfxId}] Error: ${error.message}`);
    }
}

async function run() {
    await test('r7k5l7');
}

run();
