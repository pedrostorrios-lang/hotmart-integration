#!/usr/bin/env node
require('dotenv').config();
const api = require('./api');

const example = process.argv[2] || 'help';

async function main() {
  console.log('🚀 HOTMART INTEGRATION - CLI');
  console.log('═══════════════════════════════════════════════════════');

  switch (example) {
    case '1':  await api.getAllSales(); break;
    case '2':  await api.analyzeSales(); break;
    case '3':  await api.getSalesByDateRange(process.argv[3], process.argv[4]); break;
    case '4':  await api.getSalesByStatus(process.argv[3] || 'APPROVED'); break;
    case '5':  await api.getSubscriptions(); break;
    case '6':  await api.getActiveSubscriptions(); break;
    case '7':  await api.getChurnRiskSubscriptions(); break;
    case '8':  await api.getCoupons(); break;
    case '9':  await api.createDiscountCoupon(); break;
    case '10': await api.createFixedValueCoupon(); break;
    case '11': await api.updateCoupon(process.argv[3], JSON.parse(process.argv[4] || '{}')); break;
    case '12': await api.reactivateSubscription(process.argv[3]); break;
    case '13': await api.changeBillingDate(process.argv[3], parseInt(process.argv[4])); break;
    case '14': await api.processRefund(process.argv[3], process.argv[4]); break;
    case '15': await api.createWebhook(process.argv[3] || 'https://seu-servidor.com/webhook'); break;
    case '16': await api.getProducts(); break;
    case '17': await api.getProductDetails(process.argv[3]); break;

    default:
      console.log('\n📋 Exemplos disponíveis:');
      console.log('  node src/cli.js 1                              → Listar todas as vendas');
      console.log('  node src/cli.js 2                              → Analisar vendas');
      console.log('  node src/cli.js 3 2026-01-01 2026-06-30        → Vendas por período');
      console.log('  node src/cli.js 4 APPROVED                     → Vendas por status');
      console.log('  node src/cli.js 5                              → Listar assinaturas');
      console.log('  node src/cli.js 6                              → Assinaturas ativas');
      console.log('  node src/cli.js 7                              → Assinaturas em risco');
      console.log('  node src/cli.js 8                              → Listar cupons');
      console.log('  node src/cli.js 9                              → Criar cupom % desconto');
      console.log('  node src/cli.js 10                             → Criar cupom valor fixo');
      console.log('  node src/cli.js 11 <couponId> \'{"status":"INACTIVE"}\' → Atualizar cupom');
      console.log('  node src/cli.js 12 <subscriptionId>            → Reativar assinatura');
      console.log('  node src/cli.js 13 <subscriptionId> 15         → Mudar dia de cobrança');
      console.log('  node src/cli.js 14 <saleId> "Motivo"           → Processar reembolso');
      console.log('  node src/cli.js 15 https://meu-site.com/webhook → Criar webhook');
      console.log('  node src/cli.js 16                             → Listar produtos');
      console.log('  node src/cli.js 17 <productId>                 → Detalhes do produto');
  }
}

main().catch(console.error);
