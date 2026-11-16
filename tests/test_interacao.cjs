const { test } = require('node:test');
const assert = require('node:assert/strict');
const { pontoLocal, indiceProximo, posicaoDica } = require('../painel/interacao.js');

function svgEscalado(escala, left, top) {
  return { getScreenCTM: () => ({ inverse: () => ({ a: 1 / escala, b: 0, c: 0, d: 1 / escala, e: -left / escala, f: -top / escala }) }) };
}

test('seleciona o mesmo mês com SVG centralizado, zoom e página rolada', () => {
  // Junho/2024 é o mês 113 da série iniciada em janeiro/2015.
  const x = 50 + (853 - 50 - 96) * 113 / 141;
  for (const escala of [.5, .8058333333, 1, 1.25, 2]) {
    for (const top of [-240, 355]) {
      const svg = svgEscalado(escala, 107.612, top);
      const ponto = pontoLocal(svg, 107.612 + x * escala, top + 80 * escala);
      assert.equal(indiceProximo(ponto.x, 50, 757, 0, 141), 113);
      assert.ok(Math.abs(ponto.y - 80) < 1e-8);
    }
  }
});

test('início, fim e meio entre meses respeitam a amostra mais próxima', () => {
  assert.equal(indiceProximo(-30, 50, 750, 11, 141), 11);
  assert.equal(indiceProximo(900, 50, 750, 11, 141), 141);
  assert.equal(indiceProximo(399, 50, 750, 11, 141), 76);
  assert.equal(indiceProximo(50, 50, 50, 11, 11), 11);
});

test('minigráfico usa coordenadas SVG, inclusive escala não uniforme', () => {
  const svg = { getScreenCTM: () => ({ inverse: () => ({ a: .5, b: 0, c: 0, d: 2, e: -40, f: -200 }) }) };
  const ponto = pontoLocal(svg, 200, 106);
  assert.deepEqual(ponto, { x: 60, y: 12 });
  assert.equal(Math.floor(ponto.x / 120 * 12), 6);
  assert.equal(pontoLocal({ getScreenCTM: () => null }, 0, 0), null);
});

test('tooltip troca de lado e permanece dentro do gráfico e da janela', () => {
  const viewport = { width: 1000, height: 700 };
  const painel = { left: 20, top: 200, right: 800, bottom: 500 };
  const p = posicaoDica(760, 450, 220, 120, viewport, painel);
  assert.ok(p.left + 220 < 760);
  assert.ok(p.left >= painel.left && p.left + 220 <= painel.right);
  assert.ok(p.top >= painel.top && p.top + 120 <= painel.bottom);
  const mobile = posicaoDica(380, 830, 250, 120, { width: 390, height: 844 });
  assert.ok(mobile.left >= 8 && mobile.left + 250 <= 382);
  assert.ok(mobile.top >= 8 && mobile.top + 120 <= 836);
  const cortado = posicaoDica(600, 680, 220, 120, viewport, { left: 20, top: 650, right: 800, bottom: 950 });
  assert.ok(cortado.top >= 8 && cortado.top + 120 <= 692);
});
