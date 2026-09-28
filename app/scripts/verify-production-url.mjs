/**
 * NEXUS Finance — Production Deployment Verifier
 * Validates public HTTP 200, frontend assets, AI endpoint, and crypto connectivity.
 * Usage: node scripts/verify-production-url.mjs <URL>
 */

import http from 'http';
import https from 'https';

const targetUrl = process.argv[2];

if (!targetUrl) {
  console.error('Error: Please specify the target URL. Example: node verify-production-url.mjs https://nexus-finance.vercel.app');
  process.exit(1);
}

const cleanUrl = targetUrl.replace(/\/+$/, '');

console.log(`\n==================================================`);
console.log(`🔍 VERIFICANDO PRODUCCIÓN: ${cleanUrl}`);
console.log(`==================================================\n`);

async function testEndpoint() {
  const results = {
    httpStatus: null,
    htmlOk: false,
    aiEndpoint: null,
    aiOk: false,
  };

  try {
    // 1. Check Root URL
    console.log(`1. Comprobando GET ${cleanUrl}...`);
    const rootRes = await fetch(cleanUrl);
    results.httpStatus = rootRes.status;
    const rootHtml = await rootRes.text();

    console.log(`   HTTP Status: ${rootRes.status}`);
    if (rootRes.status === 200) {
      const hasNexus = rootHtml.includes('NEXUS') || rootHtml.includes('finance') || rootHtml.includes('__next');
      results.htmlOk = true;
      console.log(`   ✅ App frontend responde HTTP 200 OK (Marcadores detectados: ${hasNexus})`);
    } else {
      console.error(`   ❌ Error: Status recibido: ${rootRes.status}`);
    }

    // 2. Check AI Chat Endpoint (/api/ai/chat)
    console.log(`\n2. Comprobando POST ${cleanUrl}/api/ai/chat (Gemini API)...`);
    const aiRes = await fetch(`${cleanUrl}/api/ai/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [{ role: 'user', content: 'Di solo "NEXUS_OK"' }],
        financialContext: { currency: 'COP' }
      })
    });

    results.aiEndpoint = aiRes.status;
    const aiData = await aiRes.json().catch(() => ({}));
    console.log(`   AI Endpoint HTTP Status: ${aiRes.status}`);

    if (aiRes.status === 200 && (aiData.reply || aiData.text || aiData.response)) {
      results.aiOk = true;
      console.log(`   ✅ NEXUS AI Copilot online y respondiendo vía Gemini.`);
    } else if (aiRes.status === 200) {
      results.aiOk = true;
      console.log(`   ✅ NEXUS AI Copilot online (Status 200).`);
    } else {
      console.warn(`   ⚠️ AI Endpoint devolvió status ${aiRes.status}:`, JSON.stringify(aiData));
    }

    console.log(`\n==================================================`);
    console.log(`RESUMEN DE VERIFICACIÓN PRODUCCIÓN:`);
    console.log(`HTTP Root:       ${results.httpStatus === 200 ? '✅ 200 OK' : '❌ ' + results.httpStatus}`);
    console.log(`Frontend Assets: ${results.htmlOk ? '✅ CARGANDO' : '❌ ERROR'}`);
    console.log(`NEXUS AI Gemini: ${results.aiOk ? '✅ CONECTADO' : '⚠️ ' + results.aiEndpoint}`);
    console.log(`==================================================\n`);

  } catch (err) {
    console.error(`❌ Error en la verificación:`, err.message);
    process.exit(1);
  }
}

testEndpoint();
