/* Geometria compartilhada por gráficos e minigráficos, sem dependências. */
((root, factory) => {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.GraficoInteracao = api;
})(globalThis, () => {
  const limitar = (v, min, max) => Math.max(min, Math.min(max, v));

  function pontoLocal(svg, clientX, clientY) {
    const tela = svg.getScreenCTM();
    if (!tela) return null;
    // A inversa inclui escala, zoom, translação e as margens de preserveAspectRatio.
    const m = tela.inverse();
    const x = m.a * clientX + m.c * clientY + m.e;
    const y = m.b * clientX + m.d * clientY + m.f;
    return Number.isFinite(x) && Number.isFinite(y) ? { x, y } : null;
  }

  function indiceProximo(x, esquerda, direita, primeiro, ultimo) {
    if (direita <= esquerda || ultimo <= primeiro) return primeiro;
    return limitar(Math.round(primeiro + (x - esquerda) / (direita - esquerda) * (ultimo - primeiro)), primeiro, ultimo);
  }

  function posicaoDica(x, y, largura, altura, viewport, painel) {
    const margem = 8, distancia = 16;
    let minX = margem, maxX = viewport.width - largura - margem;
    let minY = margem, maxY = viewport.height - altura - margem;
    if (painel && Math.min(viewport.width, painel.right) - Math.max(0, painel.left) >= largura + margem * 2) {
      minX = Math.max(minX, painel.left + margem);
      maxX = Math.min(maxX, painel.right - largura - margem);
    }
    if (painel && Math.min(viewport.height, painel.bottom) - Math.max(0, painel.top) >= altura + margem * 2) {
      minY = Math.max(minY, painel.top + margem);
      maxY = Math.min(maxY, painel.bottom - altura - margem);
    }
    const left = x + distancia + largura <= maxX + largura ? x + distancia : x - largura - distancia;
    const top = y - altura - distancia >= minY ? y - altura - distancia : y + distancia;
    return { left: limitar(left, minX, Math.max(minX, maxX)), top: limitar(top, minY, Math.max(minY, maxY)) };
  }

  return { pontoLocal, indiceProximo, posicaoDica };
});
