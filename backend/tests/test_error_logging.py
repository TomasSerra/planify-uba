"""Tests de los handlers globales de error + endpoint /client-errors.

Usamos TestClient SIN context manager para no disparar el lifespan (que abriría
el pool real contra una DB inexistente). `raise_server_exceptions=False` hace que
el catch-all handler forme la respuesta 500 en vez de re-lanzar la excepción.
"""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

import api.main as main

client = TestClient(main.app, raise_server_exceptions=False)


def test_client_error_endpoint_devuelve_204():
    res = client.post(
        "/client-errors",
        json={"message": "boom", "kind": "onerror", "name": "TypeError"},
    )
    assert res.status_code == 204


def test_client_error_payload_invalido_es_422():
    # Falta `kind` (requerido) → validación 422 con detail estructurado.
    res = client.post("/client-errors", json={"message": "boom"})
    assert res.status_code == 422
    assert "detail" in res.json()


def test_http_exception_devuelve_detail():
    # Ruta inexistente → 404 formado por el handler de HTTPException.
    res = client.get("/ruta-que-no-existe")
    assert res.status_code == 404
    assert res.json() == {"detail": "Not Found"}


def test_error_no_manejado_es_500_sin_filtrar_internals(monkeypatch):
    # Forzamos un error inesperado dentro de un endpoint: el catch-all devuelve
    # un 500 genérico sin exponer el detalle interno al cliente.
    def _boom():
        raise RuntimeError("secreto interno que no debe filtrarse")

    monkeypatch.setattr(main.pool, "connection", _boom)
    res = client.get("/carreras")
    assert res.status_code == 500
    assert res.json() == {"detail": "Error interno"}
    assert "secreto" not in res.text
