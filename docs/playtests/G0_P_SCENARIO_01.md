# G0-P — zamrożony scenariusz 01

**Seed narracyjny:** `BREEDER-01`
**Status:** scenariusz historyczny; klucz przygotowany przed pierwszą decyzją gracza

> Scenariusz sprawdzał ręczną hodowlę i został zastąpiony ciągłą, autonomiczną pętlą. Wynik: [G0_P_RESULT_01.md](G0_P_RESULT_01.md).

## Cel

Doprowadzić dowolnego potomka do mety na 100 m najpóźniej w pokoleniu 3.

## Cechy

Każdy pojazd ma trzy skrócone, widoczne oceny od 1 do 5:

- **S** — szybkość;
- **P** — prześwit;
- **T** — stabilność.

Są to grupy cech użyte tylko w storyboardzie. Produkcyjny kandydat nadal ma sześć genów opisanych w modelu domenowym.

## Pokolenie 1

| Pojazd | S | P | T | Wynik |
|---|---:|---:|---:|---|
| Skoczek | 5 | 2 | 2 | 84 m — daleki skok, upadek na dach |
| Strzała | 4 | 3 | 4 | 80 m — szybka i stabilna, zatrzymana przed końcowym podjazdem |
| Kozica | 2 | 4 | 3 | 78 m — pokonała przeszkodę, zabrakło prędkości |
| Borsuk | 3 | 3 | 5 | 76 m — bezpieczny, lecz zbyt wolny |

## Profile

- **Ostrożny:** jedna mała zmiana.
- **Zrównoważony:** dwie umiarkowane zmiany z możliwym kosztem.
- **Odważny:** duże zmiany i wyższe ryzyko regresu.

## Reguła próby

Po ograniczeniu każdej cechy do zakresu 1–5:

1. pojazd z `S = 5` i `T ≤ 2` rozbija się najpóźniej na 84 m;
2. pojazd z `P ≤ 2` i `S < 5` zatrzymuje się na 52 m;
3. pojazd z `S + P ≥ 9` oraz `T ≥ 3` kończy trasę;
4. pozostali osiągają `46 + 6P + 4S` metrów, maksymalnie 96 m;
5. dla `P ≤ 2`, `S = 5` i `T ≥ 3` wynik wynosi 90 m.

Reguła jest uproszczonym kluczem Wizard of Oz, nie projektem produkcyjnego modelu fizyki.

## Pokolenie 2 — zamrożone zmiany

Pierwszy slot jest chronioną kopią `(+0, +0, +0)`.

Trzej potomkowie otrzymują zależnie od profilu:

| Profil | Potomek 1 | Potomek 2 | Potomek 3 |
|---|---|---|---|
| Ostrożny | `(+1, 0, 0)` | `(0, +1, 0)` | `(0, 0, +1)` |
| Zrównoważony | `(+1, 0, -1)` | `(0, +1, 0)` | `(-1, +1, +1)` |
| Odważny | `(+2, -1, -1)` | `(-1, +2, 0)` | `(+1, +1, -2)` |

## Pokolenie 3 — zamrożone zmiany

Pierwszy slot jest chronioną kopią `(+0, +0, +0)`.

| Profil | Potomek 1 | Potomek 2 | Potomek 3 |
|---|---|---|---|
| Ostrożny | `(+1, 0, 0)` | `(0, +1, 0)` | `(0, 0, +1)` |
| Zrównoważony | `(+1, +1, -1)` | `(-1, +1, +1)` | `(+1, -1, +1)` |
| Odważny | `(+2, 0, -2)` | `(0, +2, -1)` | `(-2, +1, +2)` |

## Kontrfaktyczny wariant bez chronionej kopii

W obu pokoleniach slot kopii zastępuje dodatkowa zmiana:

| Profil | Dodatkowy potomek |
|---|---|
| Ostrożny | `(0, 0, -1)` |
| Zrównoważony | `(+1, -1, +1)` |
| Odważny | `(-2, 0, +2)` |

Kontrfaktyczny wynik zostanie pokazany dopiero po zakończeniu decyzji gracza.
