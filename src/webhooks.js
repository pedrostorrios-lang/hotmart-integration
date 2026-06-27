const { Router } = require('express');
const db = require('./db');

const router = Router();

router.post('/', (req, res) => {
  try {
    const event = req.body?.event || req.body?.hottok || 'UNKNOWN';
    const payload = JSON.stringify(req.body);

    db.insertWebhookEvent.run(event, payload);

    console.log(`\n🔔 Webhook recebido: ${event}`);

    // Reações automáticas por tipo de evento
    switch (event) {
      case 'SALE_APPROVED':
        console.log(`   ✅ Nova venda aprovada: ${req.body?.data?.buyer?.email}`);
        break;
      case 'PURCHASE_APPROVED':
        console.log(`   ✅ Compra aprovada: ${req.body?.data?.buyer?.email}`);
        break;
      case 'SALE_REFUNDED':
      case 'PURCHASE_REFUNDED':
        console.log(`   💸 Reembolso: ${req.body?.data?.buyer?.email}`);
        break;
      case 'SUBSCRIPTION_CANCELED':
        console.log(`   ❌ Assinatura cancelada: ${req.body?.data?.subscriber?.email}`);
        break;
      case 'SUBSCRIPTION_ACTIVATED':
        console.log(`   ✅ Assinatura ativada: ${req.body?.data?.subscriber?.email}`);
        break;
      default:
        console.log(`   ℹ️  Evento: ${event}`);
    }

    res.status(200).json({ received: true });
  } catch (err) {
    console.error('❌ Erro no webhook:', err.message);
    res.status(500).json({ error: 'Internal error' });
  }
});

module.exports = router;
