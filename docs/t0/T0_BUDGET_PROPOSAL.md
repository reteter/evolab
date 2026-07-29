# Evolution Lab — zatwierdzone budżety po T0

**Data:** 2026-07-29
**Status:** zatwierdzone przez właściciela
**Decyzja właściciela:** przyjęte bez zmian 2026-07-29
**Środowisko referencyjne v0:** desktop właściciela, aktualny stabilny Chromium,
minimum 8 GB RAM

Budżety dotyczą pierwszej grywalnej wersji M1–M4. Nie są obietnicą dla
telefonów, starszych przeglądarek ani dowolnego sprzętu.

## Bramki

| Obszar | Budżet |
|---|---|
| Pierwsza interakcja | kontrolki gotowe do użycia w maksymalnie 2 s |
| Normalna obserwacja | co najmniej 50 FPS dla jednej renderowanej próby |
| Responsywność | pauza i stop potwierdzone w maksymalnie 100 ms |
| Headless | co najmniej 30 000 kroków fizyki/s |
| Pokolenie | populacja 20, limit 1 200 kroków: P95 do 1,5 s headless |
| Stabilność | 0 wyjątków, NaN i Infinity w zaakceptowanym zestawie seedów |
| Powtarzalność | 10/10 identycznych hashy dla manifestu w zachowanym buildzie/runtime |
| Render invariance | render on/off daje identyczny ranking i potomstwo |
| Pamięć | maksymalnie 200 MB sterty i do 25 MB wzrostu po rozgrzaniu na 1 000 pokoleń |
| Retencja | agregaty do 2 kB/pokolenie; ślad rekordzisty do 2 MB |
| Dystrybucja | początkowy transfer Planck-only do 200 kB gzip; brak backendu |

## Reguła reakcji

- Najpierw zmniejszamy telemetrię i porcję pracy.
- Worker powstaje tylko po przekroczeniu budżetu responsywności lub
  przepustowości.
- Nie obniżamy powtarzalności ani nie rozszerzamy wspieranych środowisk bez
  decyzji właściciela.
- Niespełnienie bramki zatrzymuje G1 albo dany milestone; nie jest powodem do
  ukrytego rozszerzenia architektury.

Decyzję utrwala
[ADR-0003](../adr/0003-accept-v0-performance-and-retention-budgets.md).
