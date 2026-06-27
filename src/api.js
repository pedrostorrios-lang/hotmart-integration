require('dotenv').config();
const axios = require('axios');
const { getToken } = require('./auth');
const db = require('./db');

const BASE_URL = 'https://developers.hotmart.com';

async function client() {
  const token = await getToken();
  return axios.create({
    baseURL: BASE_URL,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    }
  });
}

// ========================================
// VENDAS
// ========================================

async function getAllSales() {
  console.log('\n📥 Buscando todas as vendas...');
  try {
    const http = await client();
    const response = await http.get('/payments/api/v1/sales/history');
    const items = response.data.items || [];
    console.log(`✅ ${items.length} vendas encontradas`);
    items.forEach(sale => {
      db.upsertSale.run({
        id: sale.purchase?.transaction,
        status: sale.purchase?.status,
        product_name: sale.product?.name,
        product_id: sale.product?.id?.toString(),
        buyer_name: sale.buyer?.name,
        buyer_email: sale.buyer?.email,
        payment_method: sale.purchase?.payment?.method,
        value: sale.purchase?.price?.value,
        currency: sale.purchase?.price?.currency_code,
        created_at: new Date(sale.purchase?.order_date).toISOString()
      });
    });
    return items;
  } catch (error) {
    console.error('❌ Erro:', error.response?.data || error.message);
  }
}

async function getSalesByDateRange(startDate, endDate) {
  console.log(`\n📥 Vendas de ${startDate} até ${endDate}...`);
  try {
    const http = await client();
    const response = await http.get('/payments/api/v1/sales/history', {
      params: {
        start_date: new Date(startDate).getTime(),
        end_date: new Date(endDate).getTime()
      }
    });
    return response.data.items || [];
  } catch (error) {
    console.error('❌ Erro:', error.response?.data || error.message);
  }
}

async function getSalesByStatus(status) {
  console.log(`\n📥 Vendas com status: ${status}...`);
  try {
    const http = await client();
    const response = await http.get('/payments/api/v1/sales/history', {
      params: { transaction_status: status }
    });
    return response.data.items || [];
  } catch (error) {
    console.error('❌ Erro:', error.response?.data || error.message);
  }
}

async function analyzeSales() {
  console.log('\n📊 Analisando vendas...');
  try {
    const sales = await getAllSales();

    if (!sales || sales.length === 0) {
      console.log('⚠️  Nenhuma venda encontrada');
      return;
    }

    const analysis = {
      totalVendas: sales.length,
      receita: 0,
      maiorVenda: 0,
      menorVenda: Infinity,
      ticketMedio: 0,
      por_status: {},
      por_produto: {},
      por_metodo: {}
    };

    sales.forEach(sale => {
      const valor = sale.purchase?.price?.value || 0;

      analysis.receita += valor;
      analysis.maiorVenda = Math.max(analysis.maiorVenda, valor);
      analysis.menorVenda = Math.min(analysis.menorVenda, valor);

      const status = sale.purchase?.status || 'unknown';
      analysis.por_status[status] = (analysis.por_status[status] || 0) + 1;

      const produto = sale.product?.name || 'unknown';
      if (!analysis.por_produto[produto]) {
        analysis.por_produto[produto] = { vendas: 0, receita: 0 };
      }
      analysis.por_produto[produto].vendas += 1;
      analysis.por_produto[produto].receita += valor;

      const metodo = sale.purchase?.payment?.method || 'unknown';
      analysis.por_metodo[metodo] = (analysis.por_metodo[metodo] || 0) + 1;
    });

    analysis.ticketMedio = analysis.receita / analysis.totalVendas;

    console.log('✅ Análise concluída:');
    console.log(`   Total vendas: ${analysis.totalVendas}`);
    console.log(`   Receita: R$ ${analysis.receita.toFixed(2)}`);
    console.log(`   Ticket médio: R$ ${analysis.ticketMedio.toFixed(2)}`);
    console.log(`   Maior: R$ ${analysis.maiorVenda.toFixed(2)}`);
    console.log(`   Menor: R$ ${analysis.menorVenda === Infinity ? 0 : analysis.menorVenda.toFixed(2)}`);
    console.log(`   Por status:`, analysis.por_status);
    console.log(`   Por método:`, analysis.por_metodo);

    return analysis;
  } catch (error) {
    console.error('❌ Erro:', error.message);
  }
}

// ========================================
// ASSINATURAS
// ========================================

async function getSubscriptions() {
  console.log('\n📥 Buscando assinaturas...');
  try {
    const http = await client();
    const response = await http.get('/payments/api/v1/subscriptions');
    const items = response.data.items || [];
    console.log(`✅ ${items.length} assinaturas encontradas`);
    items.forEach(sub => {
      db.upsertSubscription.run({
        id: sub.subscription_id || sub.subscriber_code,
        subscriber_code: sub.subscriber_code,
        status: sub.status,
        product_name: sub.product?.name,
        product_id: sub.product?.id?.toString(),
        buyer_name: sub.subscriber?.name,
        buyer_email: sub.subscriber?.email,
        next_charge_date: sub.date_next_charge ? new Date(sub.date_next_charge).toISOString() : null,
        created_at: sub.accession_date ? new Date(sub.accession_date).toISOString() : new Date().toISOString()
      });
    });
    return items;
  } catch (error) {
    console.error('❌ Erro:', error.response?.data || error.message);
  }
}

async function getActiveSubscriptions() {
  console.log('\n📥 Buscando assinaturas ATIVAS...');
  try {
    const http = await client();
    const response = await http.get('/payments/api/v1/subscriptions', {
      params: { status: 'ACTIVE' }
    });
    return response.data.items || [];
  } catch (error) {
    console.error('❌ Erro:', error.message);
  }
}

async function getChurnRiskSubscriptions() {
  console.log('\n⚠️  Buscando assinaturas em risco...');
  try {
    const subs = await getSubscriptions();
    const riskSubs = (subs || []).filter(sub => {
      const nextCharge = new Date(sub.date_next_charge);
      const daysUntilCharge = (nextCharge - new Date()) / (1000 * 60 * 60 * 24);
      return daysUntilCharge <= 7 && daysUntilCharge > 0;
    });
    console.log(`✅ ${riskSubs.length} assinaturas em risco`);
    return riskSubs;
  } catch (error) {
    console.error('❌ Erro:', error.message);
  }
}

async function reactivateSubscription(subscriptionId) {
  console.log(`\n♻️  Reativando assinatura ${subscriptionId}...`);
  try {
    const http = await client();
    const response = await http.post(
      `/payments/api/v1/subscriptions/${subscriptionId}/reactivate`,
      { charge_now: true }
    );
    console.log('✅ Assinatura reativada!');
    return response.data;
  } catch (error) {
    console.error('❌ Erro:', error.response?.data || error.message);
    console.log('⚠️  Nota: cliente pode precisar aprovar a reativação');
  }
}

async function changeBillingDate(subscriptionId, newDay) {
  console.log(`\n📅 Mudando dia da cobrança para: ${newDay}...`);
  try {
    const http = await client();
    const response = await http.put(
      `/payments/api/v1/subscriptions/${subscriptionId}/billing-date`,
      { billing_day: newDay }
    );
    console.log('✅ Data de cobrança atualizada!');
    return response.data;
  } catch (error) {
    console.error('❌ Erro:', error.response?.data || error.message);
  }
}

// ========================================
// CUPONS
// ========================================

async function getCoupons() {
  console.log('\n📥 Buscando cupons...');
  try {
    const http = await client();
    const response = await http.get('/payments/api/v1/coupons');
    const items = response.data.items || [];
    console.log(`✅ ${items.length} cupons encontrados`);
    items.forEach(c => {
      db.upsertCoupon.run({
        id: c.id || c.code,
        code: c.code,
        coupon_type: c.coupon_type,
        discount: c.discount,
        status: c.status,
        max_uses: c.max_uses,
        valid_until: c.valid_until
      });
    });
    return items;
  } catch (error) {
    console.error('❌ Erro:', error.message);
  }
}

async function createCoupon(couponData) {
  console.log(`\n🎟️  Criando cupom: ${couponData.code}...`);
  try {
    const http = await client();
    const response = await http.post('/payments/api/v1/coupons', couponData);
    console.log('✅ Cupom criado com sucesso!');
    return response.data;
  } catch (error) {
    console.error('❌ Erro:', error.response?.data || error.message);
  }
}

async function createDiscountCoupon() {
  return await createCoupon({
    code: 'ULTRAPASSAR100K',
    coupon_type: 'DISCOUNT_PERCENTAGE',
    discount: 15,
    valid_until: '2026-12-31',
    max_uses: 100,
    applicable_to: 'ALL_PRODUCTS',
    status: 'ACTIVE'
  });
}

async function createFixedValueCoupon() {
  return await createCoupon({
    code: 'DESCONTO50',
    coupon_type: 'DISCOUNT_VALUE',
    discount: 50.00,
    valid_until: '2026-12-31',
    max_uses: 50,
    status: 'ACTIVE'
  });
}

async function updateCoupon(couponId, updates) {
  console.log(`\n✏️  Atualizando cupom ${couponId}...`);
  try {
    const http = await client();
    const response = await http.put(`/payments/api/v1/coupons/${couponId}`, updates);
    console.log('✅ Cupom atualizado!');
    return response.data;
  } catch (error) {
    console.error('❌ Erro:', error.response?.data || error.message);
  }
}

// ========================================
// REEMBOLSOS
// ========================================

async function processRefund(saleId, reason = 'Customer request') {
  console.log(`\n💸 Processando reembolso para venda ${saleId}...`);
  try {
    const http = await client();
    const response = await http.post(
      `/payments/api/v1/sales/${saleId}/refund`,
      { reason }
    );
    console.log('✅ Reembolso processado!');
    return response.data;
  } catch (error) {
    console.error('❌ Erro:', error.response?.data || error.message);
    console.log('⚠️  Nota: pode levar 5-10 dias úteis para aparecer na conta');
  }
}

// ========================================
// WEBHOOKS
// ========================================

async function createWebhook(url) {
  console.log('\n🔔 Configurando webhook...');
  try {
    const http = await client();
    const response = await http.post('/payment/api/v1/webhooks', {
      url,
      events: [
        'SALE_APPROVED',
        'SALE_REFUNDED',
        'SUBSCRIPTION_CANCELED',
        'SUBSCRIPTION_ACTIVATED'
      ],
      active: true
    });
    console.log('✅ Webhook configurado!');
    return response.data;
  } catch (error) {
    console.error('❌ Erro:', error.response?.data || error.message);
  }
}

// ========================================
// PRODUTOS
// ========================================

async function getProducts() {
  console.log('\n📦 Buscando produtos...');
  try {
    const http = await client();
    const response = await http.get('/payments/api/v1/products');
    const items = response.data.items || [];
    console.log(`✅ ${items.length} produtos encontrados`);
    items.forEach(p => {
      db.upsertProduct.run({
        id: p.id?.toString(),
        name: p.name,
        status: p.status,
        price: p.price?.value,
        currency: p.price?.currency_value
      });
    });
    return items;
  } catch (error) {
    console.error('❌ Erro:', error.message);
  }
}

async function getProductDetails(productId) {
  console.log(`\n📦 Buscando detalhes do produto ${productId}...`);
  try {
    const http = await client();
    const response = await http.get(`/payments/api/v1/products/${productId}`);
    return response.data;
  } catch (error) {
    console.error('❌ Erro:', error.message);
  }
}

module.exports = {
  getAllSales,
  getSalesByDateRange,
  getSalesByStatus,
  analyzeSales,
  getSubscriptions,
  getActiveSubscriptions,
  getChurnRiskSubscriptions,
  reactivateSubscription,
  changeBillingDate,
  getCoupons,
  createCoupon,
  createDiscountCoupon,
  createFixedValueCoupon,
  updateCoupon,
  processRefund,
  createWebhook,
  getProducts,
  getProductDetails
};
