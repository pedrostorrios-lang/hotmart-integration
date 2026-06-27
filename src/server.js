require('dotenv').config();
const express = require('express');
const api = require('./api');
const db = require('./db');
const webhookRouter = require('./webhooks');

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;

// ========================================
// HEALTH
// ========================================

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ========================================
// VENDAS
// ========================================

app.get('/sales', async (req, res) => {
  try {
    const { status, start_date, end_date, source } = req.query;

    if (source === 'db') {
      if (status) return res.json(db.getSalesByStatus.all(status));
      if (start_date && end_date) return res.json(db.getSalesByDateRange.all(start_date, end_date));
      return res.json(db.getSales.all());
    }

    let data;
    if (status) data = await api.getSalesByStatus(status);
    else if (start_date && end_date) data = await api.getSalesByDateRange(start_date, end_date);
    else data = await api.getAllSales();

    res.json(data || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/sales/analysis', async (req, res) => {
  try {
    const analysis = await api.analyzeSales();
    res.json(analysis);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/sales/:id/refund', async (req, res) => {
  try {
    const result = await api.processRefund(req.params.id, req.body.reason);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ========================================
// ASSINATURAS
// ========================================

app.get('/subscriptions', async (req, res) => {
  try {
    const { status, source } = req.query;

    if (source === 'db') {
      if (status === 'ACTIVE') return res.json(db.getActiveSubscriptions.all());
      return res.json(db.getSubscriptions.all());
    }

    let data;
    if (status === 'ACTIVE') data = await api.getActiveSubscriptions();
    else data = await api.getSubscriptions();

    res.json(data || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/subscriptions/churn-risk', async (req, res) => {
  try {
    const data = await api.getChurnRiskSubscriptions();
    res.json(data || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/subscriptions/:id/reactivate', async (req, res) => {
  try {
    const result = await api.reactivateSubscription(req.params.id);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/subscriptions/:id/billing-date', async (req, res) => {
  try {
    const result = await api.changeBillingDate(req.params.id, req.body.billing_day);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ========================================
// CUPONS
// ========================================

app.get('/coupons', async (req, res) => {
  try {
    const { source } = req.query;
    if (source === 'db') return res.json(db.getCoupons.all());
    const data = await api.getCoupons();
    res.json(data || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/coupons', async (req, res) => {
  try {
    const result = await api.createCoupon(req.body);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/coupons/:id', async (req, res) => {
  try {
    const result = await api.updateCoupon(req.params.id, req.body);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ========================================
// PRODUTOS
// ========================================

app.get('/products', async (req, res) => {
  try {
    const { source } = req.query;
    if (source === 'db') return res.json(db.getProducts.all());
    const data = await api.getProducts();
    res.json(data || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/products/:id', async (req, res) => {
  try {
    const data = await api.getProductDetails(req.params.id);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ========================================
// WEBHOOKS
// ========================================

app.use('/webhook', webhookRouter);

app.get('/webhook/events', (req, res) => {
  res.json(db.getWebhookEvents.all());
});

// ========================================
// START
// ========================================

app.listen(PORT, () => {
  console.log(`\n🚀 Hotmart Integration rodando em http://localhost:${PORT}`);
  console.log('\n📋 Endpoints disponíveis:');
  console.log(`   GET  /health`);
  console.log(`   GET  /sales                         → vendas da API`);
  console.log(`   GET  /sales?status=APPROVED         → filtrar por status`);
  console.log(`   GET  /sales?start_date=&end_date=   → filtrar por data`);
  console.log(`   GET  /sales?source=db               → vendas do banco local`);
  console.log(`   GET  /sales/analysis                → análise de vendas`);
  console.log(`   POST /sales/:id/refund              → processar reembolso`);
  console.log(`   GET  /subscriptions                 → todas as assinaturas`);
  console.log(`   GET  /subscriptions?status=ACTIVE   → ativas`);
  console.log(`   GET  /subscriptions/churn-risk      → em risco de cancelamento`);
  console.log(`   POST /subscriptions/:id/reactivate  → reativar assinatura`);
  console.log(`   PUT  /subscriptions/:id/billing-date → mudar data de cobrança`);
  console.log(`   GET  /coupons                       → listar cupons`);
  console.log(`   POST /coupons                       → criar cupom`);
  console.log(`   PUT  /coupons/:id                   → atualizar cupom`);
  console.log(`   GET  /products                      → listar produtos`);
  console.log(`   GET  /products/:id                  → detalhes do produto`);
  console.log(`   POST /webhook                       → receber eventos da Hotmart`);
  console.log(`   GET  /webhook/events                → histórico de eventos\n`);
});
