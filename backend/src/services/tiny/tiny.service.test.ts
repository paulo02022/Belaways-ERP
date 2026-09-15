import assert from 'node:assert/strict';
import test from 'node:test';

import { mapOrder } from './tiny.service.js';

test('maps Tiny order details including customer, total and purchased items', () => {
  const order = mapOrder({
    pedido: {
      id: '1042707942',
      numero: '5447',
      cliente: { nome: 'Cliente de teste' },
      situacao: 'Aprovado',
      total_pedido: '159,80',
      data_pedido: '09/09/2026',
      itens: [
        {
          item: {
            id_produto: '42',
            codigo: 'SKU-42',
            descricao: 'Produto comprado',
            quantidade: '2',
            valor_unitario: '79,90',
          },
        },
      ],
    },
  });

  assert.equal(order.customerName, 'Cliente de teste');
  assert.equal(order.total, 159.8);
  assert.deepEqual(order.items, [
    {
      productId: '42',
      sku: 'SKU-42',
      name: 'Produto comprado',
      quantity: 2,
      unitPrice: 79.9,
    },
  ]);
});
