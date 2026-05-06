from __future__ import annotations

import re
from dataclasses import dataclass

from bs4 import BeautifulSoup

from .config import INDEX_URL
from .http import fetch

CATEDRA_HREF_RE = re.compile(r"catedra=(\d+)")


@dataclass
class IndexEntry:
    catedra_id: int
    materia_nombre: str
    titular_raw: str  # incluye prefijo " - Lic. ..." tal como viene


def discover_catedras() -> list[IndexEntry]:
    html = fetch(INDEX_URL)
    soup = BeautifulSoup(html, "lxml")

    entries: dict[int, IndexEntry] = {}

    for table in soup.find_all("table", class_="table_tabs"):
        for row in table.find_all("tr"):
            cells = row.find_all("td")
            if len(cells) < 3:
                continue
            link = row.find("a", href=CATEDRA_HREF_RE)
            if link is None:
                continue
            match = CATEDRA_HREF_RE.search(link["href"])
            if match is None:
                continue
            catedra_id = int(match.group(1))
            if catedra_id in entries:
                continue

            materia_nombre = _clean(cells[1].get_text(" ", strip=True))
            titular_raw = _clean(cells[2].get_text(" ", strip=True))

            entries[catedra_id] = IndexEntry(
                catedra_id=catedra_id,
                materia_nombre=materia_nombre,
                titular_raw=titular_raw,
            )

    return sorted(entries.values(), key=lambda e: e.catedra_id)


def _clean(text: str) -> str:
    return re.sub(r"\s+", " ", text).strip()
