from __future__ import annotations

import argparse
import sys
import time
from collections import Counter

from .config import CATEDRA_URL, DELAY_SECONDS
from .db import get_conn, save_detalle
from .discover import IndexEntry, discover_catedras
from .http import fetch
from .parse import parse_catedra_page


def scrape_catedra(catedra_id: int) -> None:
    html = fetch(CATEDRA_URL, params={"catedra": catedra_id})
    detalle = parse_catedra_page(html)
    if detalle is None:
        print(f"  catedra={catedra_id}: sin datos parseables (omitida)")
        return
    # Modo --catedra: no pasamos por discovery, así que no sabemos la carrera.
    # save_detalle deja la columna sin tocar si la fila ya existe.
    with get_conn() as conn:
        save_detalle(conn, detalle)
    counts = Counter(c.tipo for c in detalle.cursos)
    print(
        f"  catedra={catedra_id}: {detalle.materia_nombre} "
        f"(T:{counts.get('teorico', 0)} S:{counts.get('seminario', 0)} "
        f"C:{counts.get('comision', 0)})"
    )


def scrape_many(entries: list[IndexEntry], delay: float) -> None:
    total = len(entries)
    failed: list[tuple[int, str]] = []
    for i, entry in enumerate(entries, start=1):
        prefix = f"[{i}/{total}]"
        try:
            html = fetch(CATEDRA_URL, params={"catedra": entry.catedra_id})
            detalle = parse_catedra_page(html)
            if detalle is None:
                print(f"{prefix} catedra={entry.catedra_id}: sin datos (omitida)")
                continue
            with get_conn() as conn:
                save_detalle(conn, detalle, carrera=entry.carrera_slug)
            counts = Counter(c.tipo for c in detalle.cursos)
            print(
                f"{prefix} catedra={entry.catedra_id}: {detalle.materia_nombre} "
                f"(T:{counts.get('teorico', 0)} S:{counts.get('seminario', 0)} "
                f"C:{counts.get('comision', 0)})"
            )
        except Exception as exc:
            print(f"{prefix} catedra={entry.catedra_id}: ERROR {exc!r}")
            failed.append((entry.catedra_id, repr(exc)))
        if i < total:
            time.sleep(delay)
    print()
    print(f"Resumen: {total - len(failed)}/{total} OK, {len(failed)} fallidas")
    for cid, err in failed:
        print(f"  catedra={cid}: {err}")


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        description="Scraper de horarios de Psicología (UBA)"
    )
    parser.add_argument(
        "--catedra",
        type=int,
        help="Scrapea solo esta cátedra (no consulta el índice)",
    )
    parser.add_argument(
        "--limit",
        type=int,
        help="Procesa solo las primeras N cátedras del índice",
    )
    parser.add_argument(
        "--delay",
        type=float,
        default=DELAY_SECONDS,
        help=f"Segundos entre requests (default: {DELAY_SECONDS})",
    )
    args = parser.parse_args(argv)

    if args.catedra is not None:
        print(f"Scrapeando cátedra {args.catedra}...")
        scrape_catedra(args.catedra)
        return 0

    print("Descubriendo cátedras desde el índice...")
    entries = discover_catedras()
    print(f"  {len(entries)} cátedras encontradas")
    if args.limit is not None:
        entries = entries[: args.limit]
        print(f"  --limit aplicado: {len(entries)} a procesar")
    print()
    scrape_many(entries, args.delay)
    return 0


if __name__ == "__main__":
    sys.exit(main())
