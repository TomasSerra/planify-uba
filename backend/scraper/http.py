from __future__ import annotations

import requests
from tenacity import (
    retry,
    retry_if_exception_type,
    stop_after_attempt,
    wait_exponential,
)

from .config import USER_AGENT

_session = requests.Session()
_session.headers.update({"User-Agent": USER_AGENT})


@retry(
    retry=retry_if_exception_type((requests.RequestException,)),
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=1, max=10),
    reraise=True,
)
def fetch(url: str, params: dict | None = None, timeout: int = 20) -> str:
    response = _session.get(url, params=params, timeout=timeout)
    response.raise_for_status()
    response.encoding = "ISO-8859-1"
    return response.text
