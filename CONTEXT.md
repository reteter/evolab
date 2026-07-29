# Evolution Lab

Evolution Lab jest ciągłą symulacją ewolucji pojazdów na terenie 2D. Użytkownik konfiguruje przebieg, obserwuje automatyczne pokolenia i sam decyduje, kiedy zakończyć obserwację.

## Language

**Przebieg**:
Jedna autonomiczna ewolucja z zamrożoną konfiguracją i seedem, trwająca do zatrzymania przez użytkownika.
_Avoid_: sesja, eksperyment, rozgrywka

**Konfiguracja przebiegu**:
Zestaw ustawień obowiązujący od utworzenia populacji początkowej do zatrzymania przebiegu. Zmiana konfiguracji tworzy nowy przebieg.
_Avoid_: ustawienia sesji, ustawienia na żywo

**Świat**:
Deterministyczny teren oraz stałe warunki fizyczne wyprowadzone z seedu przebiegu.
_Avoid_: poziom, skończona trasa

**Pokolenie**:
Populacja oceniona w tym samym świecie, po której automatycznie powstaje następna populacja.
_Avoid_: runda gracza, tura

**Populacja**:
Stałej wielkości zbiór pojazdów należących do jednego pokolenia.
_Avoid_: partia

**Pojazd**:
Fenotyp zbudowany z genomu, oceniany w pojedynczej próbie i posiadający zapisane pochodzenie.
_Avoid_: rozwiązanie, model

**Próba**:
Ocena jednego pojazdu od stanu początkowego do ukończenia warunku zatrzymania.
_Avoid_: wyścig, replay

**Wynik próby**:
Maksymalny postęp pojazdu oraz pomocnicze dane potrzebne do jednoznacznego rankingu.
_Avoid_: jakość pojazdu, wartość osobnika

**Ranking**:
Stabilna kolejność pojazdów danego pokolenia używana przez automatyczny dobór rodziców.
_Avoid_: wybór gracza

**Elita**:
Jeden z najwyżej sklasyfikowanych pojazdów skopiowany bez zmian do następnego pokolenia zgodnie z konfiguracją.
_Avoid_: chroniona kopia, reproduktor gracza

**Rodzice**:
Dwa pojazdy wybrane automatycznie z bieżącego rankingu do utworzenia potomka.
_Avoid_: reproduktor, wybór użytkownika

**Potomek**:
Nowy genom utworzony przez krzyżowanie genomów rodziców, a następnie mutację.
_Avoid_: ręczna modyfikacja

**Częstość mutacji**:
Prawdopodobieństwo, że pojedynczy gen potomka zostanie zmieniony.
_Avoid_: profil zmian

**Siła mutacji**:
Maksymalna skala zmiany zmutowanego genu względem wartości odziedziczonej.
_Avoid_: poziom ryzyka

**Replay najlepszego**:
Odtworzenie zapisanego śladu najlepszego dotychczas pojazdu bez ponownego liczenia jego próby.
_Avoid_: ponowna symulacja

**Pauza**:
Tymczasowe zatrzymanie przebiegu z możliwością kontynuacji tego samego stanu.
_Avoid_: stop

**Stop**:
Zakończenie przebiegu decyzją użytkownika. Kontynuacja wymaga zapisanego checkpointu, który jest poza pierwszą grywalną wersją.
_Avoid_: pauza
