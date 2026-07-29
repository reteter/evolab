# Evolution Lab — T0 browser prototype

> **PROTOTYP WYRZUCALNY — nie jest kodem produkcyjnym.**

## Pytanie

Który adapter fizyki — Rapier2D czy Planck.js — lepiej spełnia wymagania ograniczonej, ciągłej ewolucji pojazdów w przeglądarce przy wspólnych danych domenowych, fixed timestep i identycznym scenariuszu?

T0 sprawdza wykonalność i względne kompromisy. Nie zatwierdza stacku produkcyjnego.

## Uruchomienie

```text
npm run t0
```

Polecenie należy wykonać w tym katalogu. Stan istnieje wyłącznie w pamięci.

## Wspólny scenariusz

- deterministyczny teren z seedu;
- geometryczny pojazd o stałej topologii i dokładnie dwóch kołach;
- ranking po maksymalnym dystansie;
- elita, automatyczny dobór dwóch rodziców, krzyżowanie i mutacja;
- minimum dwa automatyczne pokolenia;
- fixed timestep 1/60 s;
- normalny, szybki i nierenderowany tryb;
- pauza, wznowienie, stop i ograniczony replay rekordzisty.

## Zamrożone wagi

| Kryterium | Waga |
|---|---:|
| Przepustowość i responsywność | 30% |
| Czas do grywalnego zachowania i game feel | 20% |
| Powtarzalność i debugowanie | 15% |
| Start i dystrybucja | 15% |
| Dostępność | 10% |
| Modularność i testowalność | 10% |

## Bramki bezwzględne

1. Adapter kończy automatycznie co najmniej dwa pokolenia bez błędu i nieważnego stanu.
2. Powtórzenie tego samego manifestu w tym samym buildzie daje ten sam ranking i potomstwo.
3. Włączenie renderowania nie zmienia wyniku domenowego.
4. Pauza i stop pozostają dostępne podczas ciągłego przebiegu.
5. Typy silnika fizyki nie wychodzą poza adapter.

Po zakończeniu wynik i werdykt trafiają do `NOTES.md` oraz dokumentacji projektu.
