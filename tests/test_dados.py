import csv
import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

import pandas as pd

import baixar_dados
from exportar import exportar, montar


def amostra(local):
    return pd.DataFrame([
        ['import', 2025, 1, '7208', 'A', 125, 249],
        ['import', 2025, 1, '7209', 'A', 201, 250],
        ['import', 2025, 2, '7208', 'B', 17, 1],
    ], columns=['fluxo', 'ano', 'mes', 'sh4', local, 'fob_usd', 'kg'])


class ExportacaoTests(unittest.TestCase):
    def test_preserva_operacoes_pequenas_e_preco_ponderado(self):
        dados = montar(amostra('pais'), amostra('uf'))
        for nivel in ('pais', 'uf'):
            with self.subTest(nivel=nivel):
                linhas = dados[nivel]
                self.assertEqual(len(linhas), 2)
                self.assertAlmostEqual(sum(r[4] for r in linhas), .5)
                self.assertAlmostEqual(sum(r[5] for r in linhas), .343)
                self.assertTrue(all(r[4] > 0 for r in linhas))
                preco = sum(r[5] for r in linhas) * 1000 / sum(r[4] for r in linhas)
                self.assertAlmostEqual(preco, 686)

    def test_agrega_sh4_sem_arredondar_cada_registro(self):
        dados = montar(amostra('pais'), amostra('uf'))
        linha = next(r for r in dados['pais'] if r[3] == 0)
        self.assertEqual(dados['produtos'][linha[1]], 'Aço plano')
        self.assertAlmostEqual(linha[4], .499)
        self.assertAlmostEqual(linha[5], .326)

    def test_exportacao_idempotente(self):
        with tempfile.TemporaryDirectory() as pasta:
            raiz = Path(pasta)
            (raiz / 'dados').mkdir()
            (raiz / 'painel').mkdir()
            for nivel in ('pais', 'uf'):
                amostra(nivel).to_csv(raiz / 'dados' / f'{nivel}.csv', index=False)
            self.assertTrue(exportar(pasta))
            arquivo = raiz / 'painel/dados.js'
            antes = arquivo.read_bytes()
            self.assertFalse(exportar(pasta))
            self.assertEqual(arquivo.read_bytes(), antes)
            dados = json.loads(antes.decode().removeprefix('window.DADOS = ').rstrip(';'))
            self.assertAlmostEqual(sum(r[4] for r in dados['pais']), .5)


class ColetaTests(unittest.TestCase):
    @patch('baixar_dados.time.sleep')
    @patch('baixar_dados.consulta')
    @patch('baixar_dados.ultimo_mes', return_value=(2016, 2))
    def test_cria_pasta_e_respeita_ultimo_mes(self, ultimo, consulta, sleep):
        consulta.return_value = [{
            'year': 2016, 'monthNumber': 2, 'headingCode': '7208',
            'heading': 'Aço', 'country': 'China', 'state': 'São Paulo',
            'metricFOB': 125, 'metricKG': 249,
        }]
        with tempfile.TemporaryDirectory() as pasta:
            destino = Path(pasta) / 'nova' / 'dados'
            baixar_dados.main(destino)
            for nivel in ('pais', 'uf'):
                with (destino / f'{nivel}.csv').open(encoding='utf-8', newline='') as f:
                    linhas = list(csv.DictReader(f))
                self.assertEqual(len(linhas), 4)
                self.assertEqual(linhas[0]['kg'], '249')
        self.assertEqual(consulta.call_count, 8)
        for chamada in consulta.call_args_list:
            ano, fim = chamada.args[1], chamada.args[3]
            self.assertEqual(fim, '2016-02' if ano == 2016 else '2015-12')


if __name__ == '__main__':
    unittest.main()
