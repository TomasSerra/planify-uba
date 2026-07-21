"""Tests de funciones puras del armador de planes — sin DB, sin red."""

from __future__ import annotations

from datetime import time

import pytest

from api.planes import (
    CursoEnPlan,
    FranjaExcluida,
    _curso_cumple_restricciones,
    _enumerar_combos,
    _hay_solapamiento,
    _plan_respeta_bache,
    _plan_respeta_dias_horas,
    OpcionMateria,
)


def _curso(
    id=1,
    tipo="comision",
    codigo="01",
    dia="lunes",
    hi=(10, 0),
    hf=(12, 0),
    catedra_id=1,
    profesor="Prof",
    sede="HY",
    vacantes=20,
):
    return CursoEnPlan(
        id=id,
        tipo=tipo,
        codigo=codigo,
        dia=dia,
        hora_inicio=time(*hi) if hi else None,
        hora_fin=time(*hf) if hf else None,
        catedra_id=catedra_id,
        profesor=profesor,
        sede=sede,
        vacantes=vacantes,
    )


# ----------------------------- _hay_solapamiento ------------------------------

class TestHaySolapamiento:
    def test_mismo_dia_solapan_da_true(self):
        a = _curso(id=1, dia="lunes", hi=(10, 0), hf=(12, 0))
        b = _curso(id=2, dia="lunes", hi=(11, 0), hf=(13, 0))
        assert _hay_solapamiento([a, b]) is True

    def test_mismo_dia_no_solapan_da_false(self):
        a = _curso(id=1, dia="lunes", hi=(10, 0), hf=(12, 0))
        b = _curso(id=2, dia="lunes", hi=(12, 0), hf=(14, 0))
        # hora_fin de A == hora_inicio de B → adyacentes, NO solapan.
        assert _hay_solapamiento([a, b]) is False

    def test_dias_distintos_da_false(self):
        a = _curso(id=1, dia="lunes", hi=(10, 0), hf=(12, 0))
        b = _curso(id=2, dia="martes", hi=(10, 0), hf=(12, 0))
        assert _hay_solapamiento([a, b]) is False

    def test_curso_sin_dia_se_ignora(self):
        a = _curso(id=1, dia=None, hi=None, hf=None)
        b = _curso(id=2, dia="lunes", hi=(10, 0), hf=(12, 0))
        assert _hay_solapamiento([a, b]) is False

    def test_uno_solo_no_solapa(self):
        assert _hay_solapamiento([_curso()]) is False

    def test_lista_vacia(self):
        assert _hay_solapamiento([]) is False

    def test_solapamiento_de_3_cursos(self):
        a = _curso(id=1, dia="lunes", hi=(10, 0), hf=(12, 0))
        b = _curso(id=2, dia="lunes", hi=(14, 0), hf=(16, 0))
        c = _curso(id=3, dia="lunes", hi=(15, 0), hf=(17, 0))
        assert _hay_solapamiento([a, b, c]) is True


# ----------------------------- _plan_respeta_bache ----------------------------

class TestPlanRespetaBache:
    def test_un_solo_curso_por_dia_siempre_pasa(self):
        a = _curso(id=1, dia="lunes", hi=(10, 0), hf=(12, 0))
        assert _plan_respeta_bache([a], max_bache_horas=1.0) is True

    def test_gap_dentro_del_max_pasa(self):
        a = _curso(id=1, dia="lunes", hi=(10, 0), hf=(12, 0))
        b = _curso(id=2, dia="lunes", hi=(13, 0), hf=(15, 0))
        assert _plan_respeta_bache([a, b], max_bache_horas=1.0) is True

    def test_gap_exactamente_igual_al_max_pasa(self):
        a = _curso(id=1, dia="lunes", hi=(10, 0), hf=(12, 0))
        b = _curso(id=2, dia="lunes", hi=(13, 0), hf=(15, 0))
        assert _plan_respeta_bache([a, b], max_bache_horas=1.0) is True

    def test_gap_mayor_que_max_no_pasa(self):
        a = _curso(id=1, dia="lunes", hi=(10, 0), hf=(12, 0))
        b = _curso(id=2, dia="lunes", hi=(15, 0), hf=(17, 0))  # 3h de gap
        assert _plan_respeta_bache([a, b], max_bache_horas=2.0) is False

    def test_gap_en_dias_distintos_no_cuenta(self):
        a = _curso(id=1, dia="lunes", hi=(10, 0), hf=(12, 0))
        b = _curso(id=2, dia="martes", hi=(20, 0), hf=(22, 0))
        assert _plan_respeta_bache([a, b], max_bache_horas=0.5) is True

    def test_gap_se_calcula_entre_materias_distintas(self):
        # Mismo día, distintas materias: el bache se debe contar.
        a = _curso(id=1, dia="lunes", hi=(8, 0), hf=(10, 0))
        b = _curso(id=2, dia="lunes", hi=(14, 0), hf=(16, 0))  # 4h de gap
        assert _plan_respeta_bache([a, b], max_bache_horas=3.0) is False

    def test_gap_fraccional(self):
        a = _curso(id=1, dia="lunes", hi=(10, 0), hf=(11, 30))
        b = _curso(id=2, dia="lunes", hi=(12, 0), hf=(13, 0))  # 30 min de gap
        assert _plan_respeta_bache([a, b], max_bache_horas=0.5) is True
        assert _plan_respeta_bache([a, b], max_bache_horas=0.4) is False


# ----------------------------- _plan_respeta_dias_horas -----------------------

class TestPlanRespetaDiasHoras:
    def test_none_todo_pasa(self):
        a = _curso(id=1, dia="lunes", hi=(8, 0), hf=(10, 0))
        b = _curso(id=2, dia="martes", hi=(8, 0), hf=(10, 0))
        assert _plan_respeta_dias_horas([a, b], None, None, None, None) is True

    def test_cuenta_dias_distintos(self):
        cursos = [
            _curso(id=1, dia="lunes", hi=(8, 0), hf=(10, 0)),
            _curso(id=2, dia="martes", hi=(8, 0), hf=(10, 0)),
            _curso(id=3, dia="miercoles", hi=(8, 0), hf=(10, 0)),
        ]
        assert _plan_respeta_dias_horas(cursos, None, 3, None, None) is True
        assert _plan_respeta_dias_horas(cursos, None, 2, None, None) is False
        assert _plan_respeta_dias_horas(cursos, 3, None, None, None) is True
        assert _plan_respeta_dias_horas(cursos, 4, None, None, None) is False

    def test_varios_cursos_mismo_dia_cuentan_un_dia(self):
        cursos = [
            _curso(id=1, dia="lunes", hi=(8, 0), hf=(10, 0)),
            _curso(id=2, dia="lunes", hi=(14, 0), hf=(16, 0)),
        ]
        assert _plan_respeta_dias_horas(cursos, None, 1, None, None) is True

    def test_span_es_de_primera_a_ultima_no_suma(self):
        # 8-10 y 16-18 → span 10h (suma sería 4h).
        cursos = [
            _curso(id=1, dia="lunes", hi=(8, 0), hf=(10, 0)),
            _curso(id=2, dia="lunes", hi=(16, 0), hf=(18, 0)),
        ]
        assert _plan_respeta_dias_horas(cursos, None, None, None, 6.0) is False
        assert _plan_respeta_dias_horas(cursos, None, None, None, 10.0) is True

    def test_min_horas_por_dia(self):
        cursos = [_curso(id=1, dia="lunes", hi=(10, 0), hf=(12, 0))]  # span 2h
        assert _plan_respeta_dias_horas(cursos, None, None, 2.0, None) is True
        assert _plan_respeta_dias_horas(cursos, None, None, 2.5, None) is False

    def test_horas_se_evaluan_por_dia_no_global(self):
        # Cada día span 2h; con max=3 pasa aunque haya dos días.
        cursos = [
            _curso(id=1, dia="lunes", hi=(8, 0), hf=(10, 0)),
            _curso(id=2, dia="martes", hi=(8, 0), hf=(10, 0)),
        ]
        assert _plan_respeta_dias_horas(cursos, None, None, None, 3.0) is True

    def test_ignora_cursos_sin_dia_u_hora(self):
        cursos = [
            _curso(id=1, dia="lunes", hi=(8, 0), hf=(10, 0)),
            _curso(id=2, dia=None, hi=None, hf=None),
        ]
        assert _plan_respeta_dias_horas(cursos, None, 1, None, None) is True


# ----------------------------- _curso_cumple_restricciones --------------------

class TestCursoCumpleRestricciones:
    def test_sin_restricciones_pasa(self):
        c = _curso()
        assert _curso_cumple_restricciones(c, set(), [], set()) is True

    def test_dia_excluido_falla(self):
        c = _curso(dia="lunes")
        assert _curso_cumple_restricciones(c, {"lunes"}, [], set()) is False

    def test_dia_distinto_al_excluido_pasa(self):
        c = _curso(dia="martes")
        assert _curso_cumple_restricciones(c, {"lunes"}, [], set()) is True

    def test_sede_no_permitida_falla(self):
        c = _curso(sede="AV")
        assert _curso_cumple_restricciones(c, set(), [], {"HY"}) is False

    def test_sede_permitida_pasa(self):
        c = _curso(sede="HY")
        assert _curso_cumple_restricciones(c, set(), [], {"HY", "AV"}) is True

    def test_sedes_vacio_no_filtra(self):
        c = _curso(sede="AV")
        assert _curso_cumple_restricciones(c, set(), [], set()) is True

    def test_sede_none_en_curso_no_descarta(self):
        # Si el curso no tiene sede, no se debería filtrar por sede.
        c = _curso(sede=None)
        assert _curso_cumple_restricciones(c, set(), [], {"HY"}) is True

    def test_franja_que_solapa_falla(self):
        c = _curso(dia="lunes", hi=(10, 0), hf=(12, 0))
        franja = FranjaExcluida(dias=["lunes"], hora_inicio=time(11, 0), hora_fin=time(13, 0))
        assert _curso_cumple_restricciones(c, set(), [franja], set()) is False

    def test_franja_adyacente_NO_falla(self):
        # hora_fin del curso == hora_inicio de la franja → adyacente, no solapa.
        c = _curso(dia="lunes", hi=(10, 0), hf=(12, 0))
        franja = FranjaExcluida(dias=["lunes"], hora_inicio=time(12, 0), hora_fin=time(14, 0))
        assert _curso_cumple_restricciones(c, set(), [franja], set()) is True

    def test_franja_en_otro_dia_no_afecta(self):
        c = _curso(dia="lunes", hi=(10, 0), hf=(12, 0))
        franja = FranjaExcluida(dias=["martes"], hora_inicio=time(10, 0), hora_fin=time(14, 0))
        assert _curso_cumple_restricciones(c, set(), [franja], set()) is True

    def test_franja_multiples_dias_aplica_a_cualquiera(self):
        c = _curso(dia="miercoles", hi=(10, 0), hf=(12, 0))
        franja = FranjaExcluida(
            dias=["lunes", "miercoles", "viernes"],
            hora_inicio=time(11, 0),
            hora_fin=time(13, 0),
        )
        assert _curso_cumple_restricciones(c, set(), [franja], set()) is False


# ----------------------------- _enumerar_combos -------------------------------

_DIAS_POR_MATERIA = ["lunes", "martes", "miercoles", "jueves", "viernes", "sabado"]


class TestEnumerarCombos:
    def _materia(self, codigo, comision_ids):
        # Cada materia en un día distinto → no hay solapamiento cross-materia,
        # así el enumerador (que ahora filtra solapa internamente) yield todo
        # el producto cartesiano cuando no hay conflictos.
        dia = _DIAS_POR_MATERIA[(codigo - 1) % len(_DIAS_POR_MATERIA)]
        return [
            OpcionMateria(
                materia_codigo=codigo,
                materia_nombre=f"M{codigo}",
                catedra_id=1,
                cursos=[_curso(id=cid, dia=dia)],
            )
            for cid in comision_ids
        ]

    def test_lista_vacia(self):
        assert list(_enumerar_combos([])) == []

    def test_una_sola_materia_una_opcion(self):
        materias = [self._materia(1, [10])]
        combos = list(_enumerar_combos(materias))
        assert len(combos) == 1
        assert combos[0][0].cursos[0].id == 10

    def test_dos_materias_dos_opciones_yields_4_combos(self):
        materias = [self._materia(1, [10, 11]), self._materia(2, [20, 21])]
        combos = list(_enumerar_combos(materias))
        assert len(combos) == 4
        keys = {(c[0].cursos[0].id, c[1].cursos[0].id) for c in combos}
        assert keys == {(10, 20), (10, 21), (11, 20), (11, 21)}

    def test_primer_combo_es_el_origen(self):
        materias = [self._materia(1, [10, 11]), self._materia(2, [20, 21])]
        combos = list(_enumerar_combos(materias))
        assert combos[0][0].cursos[0].id == 10
        assert combos[0][1].cursos[0].id == 20

    def test_segundo_combo_varia_solo_una_materia(self):
        materias = [self._materia(1, [10, 11]), self._materia(2, [20, 21])]
        combos = list(_enumerar_combos(materias))
        diffs = sum(
            1
            for a, b in zip(combos[0], combos[1])
            if a.cursos[0].id != b.cursos[0].id
        )
        assert diffs == 1

    def test_no_emite_duplicados(self):
        materias = [self._materia(1, [10, 11, 12]), self._materia(2, [20, 21, 22])]
        combos = list(_enumerar_combos(materias))
        keys = [tuple(op.cursos[0].id for op in c) for c in combos]
        assert len(keys) == len(set(keys)) == 9

    def test_solapamiento_total_no_yield(self):
        # Ambas materias mismo día/hora → 0 combos válidos.
        op_m1 = OpcionMateria(materia_codigo=1, materia_nombre="M1", catedra_id=1,
                              cursos=[_curso(id=10, dia="lunes", hi=(10, 0), hf=(12, 0))])
        op_m2 = OpcionMateria(materia_codigo=2, materia_nombre="M2", catedra_id=2,
                              cursos=[_curso(id=20, dia="lunes", hi=(10, 0), hf=(12, 0))])
        assert list(_enumerar_combos([[op_m1], [op_m2]])) == []

    def test_poda_descarta_opcion_que_solapa_con_todas_las_siguientes(self):
        # m0 op0 solapa con la única opción de m1 → DFS debe podar y devolver
        # solo combos con m0 op1.
        m0 = [
            OpcionMateria(materia_codigo=1, materia_nombre="M1", catedra_id=1,
                          cursos=[_curso(id=10, dia="lunes", hi=(10, 0), hf=(12, 0))]),
            OpcionMateria(materia_codigo=1, materia_nombre="M1", catedra_id=1,
                          cursos=[_curso(id=11, dia="lunes", hi=(14, 0), hf=(16, 0))]),
        ]
        m1 = [
            OpcionMateria(materia_codigo=2, materia_nombre="M2", catedra_id=2,
                          cursos=[_curso(id=20, dia="lunes", hi=(11, 0), hf=(13, 0))]),
        ]
        combos = list(_enumerar_combos([m0, m1]))
        assert len(combos) == 1
        assert combos[0][0].cursos[0].id == 11

    def test_bache_descarta_combo_en_el_leaf(self):
        # Mismo día, 6 horas de gap entre cursos: sin cap → válido, con cap → descartado.
        m0 = [OpcionMateria(materia_codigo=1, materia_nombre="M1", catedra_id=1,
                            cursos=[_curso(id=10, dia="lunes", hi=(8, 0), hf=(10, 0))])]
        m1 = [OpcionMateria(materia_codigo=2, materia_nombre="M2", catedra_id=2,
                            cursos=[_curso(id=20, dia="lunes", hi=(16, 0), hf=(18, 0))])]
        assert len(list(_enumerar_combos([m0, m1]))) == 1
        assert list(_enumerar_combos([m0, m1], max_bache_horas=4.0)) == []
