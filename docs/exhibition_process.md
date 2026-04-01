# Messe-Prozess: Lead-Qualifizierung & Gewinnspiel

## Überblick

Automatisierter Sales-Funnel für Messebesucher mit WhatsApp-Integration, QR-Code-basierter Qualifizierung und Gewinnspiel-Mechanik.

---

## 1. Einstieg: QR-Code am Messestand

- Besucher stehen vor dem Stand
- Scannen als erster Schritt den QR-Code ein
- QR-Code öffnet automatisch WhatsApp

---

## 2. Qualifizierungsfragen im WhatsApp-Chat

### Frage 1: Name
> "Bitte geben Sie Ihren Namen ein."

### Frage 2: Branche
> "In welcher Branche arbeiten Sie?"

Optionen:
- Stationäre Pflege
- Ambulante Pflege
- Tagespflege
- Bildungseinrichtung
- Medizinische Einrichtung
- Sonstige

### Frage 3: Position (abhängig von Branche)

Bei **stationärer Pflegeeinrichtung**:
- Einrichtungsleitung
- Pflegedienstleitung
- Leitung soziale Betreuung
- Pflegekraft
- Hauswirtschaft
- Wohnbereichsleitung
- Auszubildende

### Frage 4: Name der Einrichtung
> "Sagen Sie bitte kurz den Namen der Einrichtung."

### Frage 5: Postleitzahl
> z.B. "88400"

### Frage 6: Größe der Einrichtung
> "Wie viele Bewohner haben Sie?"

---

## 3. QR-Code Generierung

Nach Abschluss aller Fragen:
- Besucher erhält einen persönlichen QR-Code
- Dieser QR-Code enthält alle Qualifizierungsdaten

---

## 4. Gewinnspiel-Maschine

### Ablauf:
1. Besucher scannt seinen QR-Code an der automatischen Maschine
2. System prüft, ob die Zielgruppe passt
3. **Bei passender Zielgruppe:**
   - "Bling bling bling bling" → Gewonnen!
   - Testphase wird gewonnen
   - Termin kann direkt eingebucht werden
4. **Bei nicht passender Zielgruppe:**
   - Keine Einbuchung

---

## 5. Preisgestaltung nach Entfernung

Basis: **München** (Hauptquartier-Standort)

| Entfernung von München | Kosten Testphase |
|------------------------|------------------|
| München direkt         | 0 €              |
| Bis 100 km Umkreis     | 50 €             |
| Weiter entfernt        | 100 €            |
| Noch weiter            | 150 €            |
| Maximum (z.B. Flensburg) | 200 €          |

→ Berechnung erfolgt automatisch anhand der Postleitzahl

---

## 6. Automatisierte Kommunikation (WhatsApp)

### Bei Gewinn:
- Automatische Benachrichtigung auf das Handy
- Info was gewonnen wurde

### Terminbuchung:
- Termin kann direkt eingebucht werden
- Bestätigung via WhatsApp
- Möglichkeit zum Ändern oder Stornieren

---

## 7. Mitarbeiter-Feature (Special)

### Konzept:
- Mitarbeiter am Stand erhalten ausgedruckte QR-Codes
- Bei persönlichem Gespräch mit Interessenten:
  - Mitarbeiter zeigt QR-Code vor
  - Besucher erhält automatisch Testphase als "Special"
  - Alternative: Auch über WhatsApp möglich

---

## Zusammenfassung der Ziele

1. **Automatisierte Qualifizierung** aller Messebesucher
2. **Persönlicher QR-Code** für jeden qualifizierten Lead
3. **Gamification** durch Gewinnspiel-Maschine
4. **Entfernungsbasierte Preisgestaltung** via PLZ
5. **Nahtlose Journey** von Erstkontakt bis Terminbuchung
6. **Alles über WhatsApp** für maximale Convenience
7. **Special-Behandlung** bei persönlichem Mitarbeiter-Kontakt

---

## Offene Punkte

- [ ] Genaue PLZ-Radius-Berechnung definieren
- [ ] Mitarbeiter-QR-Code: WhatsApp oder physisch?
- [ ] Welche Positionen/Branchen sind "passende Zielgruppe"?
- [ ] Design der Gewinnspiel-Maschine
- [ ] WhatsApp Business API Integration
