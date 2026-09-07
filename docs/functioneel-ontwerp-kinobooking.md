# Functioneel Ontwerp & Vereistendocument – KinoBooking

## Documentinformatie

| Veld | Waarde |
|---|---|
| Projectnaam | KinoBooking |
| Documenttype | Functioneel ontwerp / Cahier des charges (Business Analyst document) |
| Versie | 1.1 |
| Datum | 2026-09-07 |
| Methode | Reverse-engineering van de bestaande prototype-code (`index.html`) in deze repository |
| Status | Beschrijft de huidige werking van het **statische front-end prototype**, niet van een productieklaar systeem |

> **Belangrijke opmerking vooraf.** Dit document is opgesteld door de broncode van het prototype te analyseren (HTML-structuur, Tailwind-klassen en de JavaScript-logica in `index.html`). Het beschrijft dus wat de applicatie **vandaag daadwerkelijk doet**, inclusief de plekken waar functionaliteit gesimuleerd is (bijv. met een `alert()`) in plaats van echt geïmplementeerd. Sectie 9 vat deze beperkingen expliciet samen. Versie 1.1 voegt user stories (sectie 11) en een MVP-scope- en statusanalyse (sectie 12) toe.

---

## 1. Inleiding

### 1.1 Doel van dit document

Dit document beschrijft de functionele en niet-functionele werking van **KinoBooking**, een platform voor het reserveren van diensten en het beheren van wachtrijen bij schoonheidssalons, kapsalons/spa's en horecazaken (restaurants, lounges) in Kinshasa en Lubumbashi (DR Congo). Het dient als basis voor:

- een gedeeld begrip tussen opdrachtgever en ontwikkelteam over de bestaande functionaliteit;
- de overgang van een klikbaar HTML/JS-prototype naar een volwaardige, productieklare applicatie (backend, database, betalingen, authenticatie);
- toekomstige scope- en prioriteitsbeslissingen.

### 1.2 Achtergrond en context

KinoBooking richt zich op twee marktsegmenten in Kinshasa (en later Lubumbashi):

1. **Beauté, Coiffure & Spa** – kapsalons, pruiken/tissage-specialisten, vlechtsalons (braids), spa's.
2. **Horeca** – restaurants en lounges, met een aparte flow voor tafel- en VIP-zaalreserveringen.

Beide segmenten kampen in de praktijk met vergelijkbare problemen die het platform probeert op te lossen:

- klanten moeten fysiek aanschuiven zonder zekerheid over wachttijd (walk-ins);
- eigenaars hebben geen centraal overzicht van aanvragen, afspraken en aanbetalingen;
- personeelsleden hebben soms toegang tot klantgegevens (telefoonnummers) en kunnen die gebruiken om klanten buiten de zaak om te bedienen ("klantendiefstal");
- er is geen gestructureerde manier om klanten na verloop van tijd opnieuw te benaderen (retentiemarketing).

### 1.3 Scope en methode

De scope van dit document is beperkt tot wat aantoonbaar aanwezig is in het huidige prototype (`index.html`, één statisch bestand met Tailwind CSS, Font Awesome-iconen en vanilla JavaScript, zonder build-proces, backend of database). Aannames of uitbreidingen die niet in de code zitten, worden apart vermeld onder "Aanbevelingen voor doorontwikkeling" (sectie 11) en niet vermengd met de functionele beschrijving van het prototype zelf.

---

## 2. Doelgroepen en gebruikersrollen

Het prototype onderscheidt vier rollen, zichtbaar via de tabbladen "Vue Client", "Espace Salon / Horeca" en "Admin SaaS", plus een rolselector binnen het dashboard:

| Rol | Omschrijving | Toegang in het prototype |
|---|---|---|
| **Eindklant** | Consument die een dienst, tafel of zitplaats zoekt en reserveert | "Vue Client" – zoeken, filteren, reserveren met afspraak of ticket zonder afspraak |
| **Gérant / Eigenaar** | Eigenaar of manager van een salon of horecazaak | "Espace Salon / Horeca" met volledige rechten (CRM, volledige telefoonnummers) |
| **Personeel (bv. kapster)** | Medewerker van de zaak | "Espace Salon / Horeca" met beperkte rechten (gemaskeerde telefoonnummers, geen CRM-toegang) |
| **KinoBooking Platformbeheerder** | Beheerder van het SaaS-platform zelf | "Admin SaaS" – overzicht van abonnementen, opties en platforminkomsten |

> In het huidige prototype is er **geen echte authenticatie**: de rol wordt gekozen via een `<select>`-dropdown in het dashboard ("Profil de Connexion") en de tabbladen zijn voor iedereen zonder login zichtbaar. Dit is uitdrukkelijk een simulatie van rolgedrag, geen beveiligingsmaatregel (zie sectie 10).

---

## 3. Globale werking van het prototype

De applicatie is een "single-page"-achtige HTML-pagina met drie hoofdweergaven die via JavaScript worden getoond/verborgen (geen echte routing/URL's):

1. **Vue Client** (`#view-client`) – standaard zichtbaar bij het laden van de pagina.
2. **Espace Salon / Horeca** (`#view-dashboard`) – ondernemersdashboard.
3. **Admin SaaS** (`#view-admin`) – platformbeheer en monetisatie-overzicht.

Bovenaan de pagina toont de header permanent:
- het KinoBooking-logo en de steden "Kinshasa • Lubumbashi";
- de actuele wisselkoers USD → CDF (Congolese Frank), in het prototype vast ingesteld op **1 USD = 2.850 CDF**;
- de tab-schakelaar tussen de drie bovenstaande weergaven.

Alle gegevens (bedrijven, diensten, aanvragen) worden in JavaScript-arrays in het geheugen bijgehouden (`businesses`, `requests`). Er is **geen backend en geen database**: bij het herladen van de pagina gaan alle wijzigingen (nieuwe aanvragen, toegevoegde diensten, statuswijzigingen) verloren en verschijnen opnieuw de oorspronkelijke mockgegevens.

---

## 4. Functionele vereisten

Elke functionele eis krijgt een ID (FR = Functional Requirement) voor latere traceerbaarheid.

### 4.1 Module: Klantenportaal (Vue Client)

| ID | Beschrijving |
|---|---|
| FR-1.1 | Het systeem toont een zoekbalk waarmee de klant vrij kan zoeken op bedrijfsnaam, subcategorie of dienstnaam (bijv. "perruque", "braids", "restaurant", "VIP"). |
| FR-1.2 | Het systeem laat de klant filteren op gemeente/wijk via een dropdown ("Toutes les communes", "Kinshasa – Gombe", "Kinshasa – Ngaliema", "Lubumbashi – Golf"). |
| FR-1.3 | Het systeem toont twee hoofdcategorieën als schakelknoppen: **Beauté, Coiffure & Spa** en **Horeca (Restaurants & Lounges)**. De klant kan slechts één categorie tegelijk actief hebben; de bedrijvenlijst wordt hierop gefilterd. |
| FR-1.4 | Voor elk gefilterd bedrijf toont het systeem een kaart met: foto, subcategorie-badge, badge met maximale reactietijd ("Réponse < Xh"), naam, adres + gemeente, de twee populairste diensten met prijs, de laagste aanbetaling (omgerekend naar CDF), en twee actieknoppen: "Avec RDV" (met afspraak) en "Sans RDV" (zonder afspraak/wachtrij). |
| FR-1.5 | Wanneer geen enkel bedrijf aan de zoek-/filtercriteria voldoet, toont het systeem een lege-resultaten-melding. |
| FR-1.6 | Klikken op het logo brengt de gebruiker terug naar de klantweergave, ongeacht het actieve tabblad. |

### 4.2 Module: Reservering met afspraak ("Avec Rendez-vous")

| ID | Beschrijving |
|---|---|
| FR-2.1 | De klant selecteert een dienst (bij Beauté) of een tafel/ruimte (bij Horeca) uit een dropdown die specifiek is voor het gekozen bedrijf. Het label past zich aan afhankelijk van de hoofdcategorie ("Sélectionnez la Prestation" vs. "Sélectionnez la Table ou l'Espace"). |
| FR-2.2 | Bij het selecteren van een dienst toont het systeem een beschrijving met naam, prijs, duur (in minuten) en volledige toelichting. |
| FR-2.3 | Voor Beauté-bedrijven kan de klant optioneel een voorkeursmedewerker(-ster) kiezen (bijv. "Sarah – Spécialiste Tissage", "Grace – Spécialiste Closure & Braids") of "geen voorkeur". Dit veld wordt verborgen voor Horeca-bedrijven. |
| FR-2.4 | De klant kan een schakelaar "Réservation Discrète / VIP" activeren. Dit voegt **+ $10** toe aan de vereiste aanbetaling en past de dienstbeschrijving aan om te vermelden dat een privéruimte/gereserveerde stoel wordt voorzien. |
| FR-2.5 | De klant kiest een gewenste datum (standaard vandaag) en een tijdstip uit een vaste lijst van beschikbare tijdsloten (10:00, 12:00, 14:30, 17:00). |
| FR-2.6 | De klant vult voornaam en WhatsApp-nummer in. |
| FR-2.7 | Het systeem berekent en toont in real time het vereiste aanbetalingsbedrag in CDF én in USD, inclusief eventuele VIP-toeslag. |
| FR-2.8 | Bij het versturen van de aanvraag maakt het systeem een nieuwe aanvraag aan met een uniek referentienummer ("KINO-XXX"), status **PENDING_APPROVAL** (in afwachting van validatie), en voegt deze bovenaan de aanvragenlijst van het dashboard toe. De klant betaalt op dit moment **niets**; de aanvraag is gratis en vrijblijvend totdat de zaak de beschikbaarheid bevestigt. |
| FR-2.9 | Na het versturen krijgt de klant een bevestigingsmelding dat de aanvraag is verzonden en dat de zaak de beschikbaarheid nog moet valideren. |

### 4.3 Module: Reservering zonder afspraak / virtuele wachtrij ("Sans RDV")

| ID | Beschrijving |
|---|---|
| FR-3.1 | De klant kan binnen hetzelfde reserveringsvenster wisselen naar de modus "File Sans RDV (Direct)". |
| FR-3.2 | In deze modus vult de klant enkel voornaam, WhatsApp-nummer en gewenste dienst in — geen datum, tijd, medewerker of VIP-optie. |
| FR-3.3 | Bij bevestiging kent het systeem onmiddellijk een volgnummer in de wachtrij toe (in het prototype een willekeurig getal tussen 1 en 8) en maakt een aanvraag aan met status **CONFIRMED** en een referentie "TICKET-N{nummer}", zonder aanbetaling. |
| FR-3.4 | De klant ontvangt een bevestigingsmelding met zijn/haar volgnummer en de mededeling dat een WhatsApp-melding volgt zodra de beurt nadert. |

### 4.4 Module: Ondernemersdashboard – Aanvragen & Agenda

| ID | Beschrijving |
|---|---|
| FR-4.1 | Het dashboard toont in de header: bedrijfsnaam, actief abonnement ("Business Plan $49/m"), actieve opties (bijv. "+ Option Queue QR $15/m"), adres en het directe M-Pesa-nummer van de zaak. |
| FR-4.2 | Een rolselector ("Gérant/Propriétaire" vs. "Personnel/Coiffeuse") bepaalt of volledige klantgegevens zichtbaar zijn. In de personeelsrol worden telefoonnummers gemaskeerd (enkel de eerste 3 en laatste 2 cijfers zichtbaar) als bescherming tegen het "stelen" van klantcontacten door personeel. |
| FR-4.3 | Drie KPI-kaarten tonen: (a) de maximale reactietermijn die de zaak hanteert, (b) het aantal aanvragen dat nog op validatie wacht, (c) het totaalbedrag aan aanbetalingen dat rechtstreeks via M-Pesa is ontvangen. |
| FR-4.4 | Een tabel toont alle aanvragen met klant (+ VIP-badge indien van toepassing), dienst/medewerker, datum & tijd, aanbetalingsbedrag, status, en beschikbare acties. |
| FR-4.5 | Voor aanvragen met status **PENDING_APPROVAL** kan de zaak de aanvraag **valideren** (→ status wordt APPROVED_WAITING_PAYMENT, met de mededeling dat de klant een WhatsApp-bericht krijgt en 30 minuten heeft om de aanbetaling over te maken) of **weigeren** (de aanvraag wordt volledig verwijderd uit de lijst). |
| FR-4.6 | Aanvragen met status **APPROVED_WAITING_PAYMENT** tonen een badge "Timer Paiement: 30m" zonder verdere actieknop; het systeem wacht passief op de betaling van de klant. |
| FR-4.7 | Aanvragen met status **CONFIRMED** tonen enkel de referentie (bijv. "SUR-PLACE" of "TICKET-N3"). |
| FR-4.8 | Via het tandwiel-icoon kan de zaak de maximale reactietermijn instellen (in uren). Het systeem staat geen waarde toe boven de **6 uur**, conform het (in het prototype gesimuleerde) KinoBooking-reglement. |
| FR-4.9 | Via de knop "+ Client Sans RDV" kan personeel ter plaatse snel een walk-in-klant toevoegen (naam optioneel, dienst verplicht), wat direct een bevestigde aanvraag met referentie "SUR-PLACE" aanmaakt zonder aanbetaling. |

### 4.5 Module: Catalogus- en tariefbeheer

| ID | Beschrijving |
|---|---|
| FR-5.1 | De zaak kan haar volledige dienstenaanbod raadplegen als kaarten met categorie, duur, naam, beschrijving, totaalprijs en vereiste aanbetaling. |
| FR-5.2 | Via "Ajouter un Service" kan een nieuwe dienst worden toegevoegd met: naam, categorie, gedetailleerde klantgerichte beschrijving, duur (minuten), totaalprijs (USD) en aanbetaling (USD). |
| FR-5.3 | Een nieuw toegevoegde dienst verschijnt onmiddellijk bovenaan zowel de cataloguslijst van de zaak als de dienstenlijst die klanten te zien krijgen. |

### 4.6 Module: Automatische WhatsApp-marketing (add-on)

| ID | Beschrijving |
|---|---|
| FR-6.1 | Als betaalde optie ($20/maand) toont het systeem een uitleg dat het platform automatisch een gepersonaliseerd WhatsApp-bericht verstuurt naar klanten die 30 dagen niet zijn teruggekomen, om hen opnieuw uit te nodigen. |
| FR-6.2 | Het systeem benadrukt dat personeel **geen toegang** heeft tot de onderliggende telefoonnummers bij deze automatische heractivatie (privacybescherming). |
| FR-6.3 | Het dashboard toont een indicatieve omzet die deze module deze maand zou hebben gegenereerd (bijv. "$540.00" uit 12 automatische heractiveringen). |

### 4.7 Module: QR-wachtrij voor walk-ins (add-on)

| ID | Beschrijving |
|---|---|
| FR-7.1 | Als betaalde optie ($15/maand) kan de zaak een "Poster QR" openen die een visuele QR-code toont, bedoeld om aan de ingang van de zaak op te hangen. |
| FR-7.2 | De poster legt uit dat de klant de code scant, zijn naam invoert en vervolgens live op zijn telefoon zijn volgnummer in de wachtrij ziet. |
| FR-7.3 | Een knop laat toe een afdrukbare A4-versie (PDF) te "downloaden". |

### 4.8 Module: Platformbeheer (Admin SaaS)

| ID | Beschrijving |
|---|---|
| FR-8.1 | Het adminoverzicht toont vier omzetcategorieën: (a) basis-SaaS-abonnementen, (b) inkomsten uit de QR-wachtrij-optie, (c) inkomsten uit de WhatsApp-marketingoptie, (d) directe servicekosten op VIP-reserveringen. |
| FR-8.2 | Voor elke categorie toont het systeem het huidige maandbedrag en een korte toelichting (bijv. aantal zaken dat de optie afneemt). |
| FR-8.3 | Een tariefoverzicht toont de drie beschikbare opties/tiers met prijs en beschrijving: QR-wachtrijmodule (+$15/m), WhatsApp-marketing (+$20/m), en de VIP-reserveringsoptie (inbegrepen in Business/Pro-abonnementen, met een platform-servicekost van $3 tot $5 per VIP-boeking die de eindklant betaalt). |

---

## 5. Bedrijfsregels (Business Rules)

| ID | Regel |
|---|---|
| BR-1 | Prijzen worden intern beheerd in **USD** en weergegeven in **CDF** via een vaste omrekeningskoers (in het prototype: 1 USD = 2.850 CDF). |
| BR-2 | Een reservering **met afspraak** is voor de klant volledig **gratis en vrijblijvend** totdat de zaak deze valideert; pas na validatie wordt een aanbetaling gevraagd. |
| BR-3 | De aanbetaling wordt **rechtstreeks door de klant aan de zaak** overgemaakt via mobiel geld (M-Pesa), niet via het platform zelf. |
| BR-4 | De VIP/discrete-optie voegt een vaste **+$10** toe aan de aanbetaling die de klant betaalt aan de zaak, en genereert daarnaast een aparte **servicekost van $3 tot $5 voor het platform** zelf, betaald door de eindklant. |
| BR-5 | Elke zaak stelt een **maximale reactietermijn** in voor het beantwoorden van aanvragen; deze termijn mag nooit hoger zijn dan **6 uur**, ongeacht wat de zaak zelf zou willen instellen. |
| BR-6 | Na validatie door de zaak krijgt de klant een venster van **30 minuten** om de aanbetaling te betalen (in het prototype is dit een informatief label; er is geen automatische aftelling of automatische annulering geïmplementeerd). |
| BR-7 | Reserveringen **zonder afspraak** (walk-in/wachtrij) vereisen **geen aanbetaling** en worden **onmiddellijk bevestigd** met een volgnummer, zonder validatiestap door de zaak. |
| BR-8 | Personeelsleden (rol "Personnel") mogen **nooit** het volledige telefoonnummer van een klant zien; enkel de eerste 3 en laatste 2 cijfers zijn zichtbaar. Enkel de rol "Gérant/Propriétaire" heeft volledige toegang. |
| BR-9 | Elk bedrijf behoort tot precies **één hoofdcategorie**: Beauté óf Horeca. Deze keuze bepaalt welke velden in het reserveringsformulier zichtbaar zijn (bijv. medewerkerkeuze enkel bij Beauté). |

---

## 6. Gegevensmodel (zoals gebruikt in het prototype)

### 6.1 Entiteit: Bedrijf (`Business`)

| Veld | Type | Omschrijving |
|---|---|---|
| id | tekst | Unieke identificatie |
| name | tekst | Naam van de zaak |
| mainCat | enum | `Beauty` of `Horeca` |
| subCat | tekst | Subcategorie, getoond als badge (bv. "Coiffure & Perruques") |
| city | tekst | Gemeente + stad (bv. "Gombe, Kinshasa") |
| address | tekst | Straatadres |
| depositUsd | getal | Laagste aanbetaling, gebruikt in de overzichtskaart |
| image | URL | Cover-foto |
| timeoutHours | getal | Maximale reactietermijn (uren) |
| services | lijst | Collectie van `Service`-entiteiten (zie 6.2) |

### 6.2 Entiteit: Dienst (`Service`)

| Veld | Type | Omschrijving |
|---|---|---|
| id | tekst | Unieke identificatie |
| name | tekst | Naam van de dienst/tafel |
| cat | tekst | Categorie binnen de zaak (bv. "Tresses & Braids", "Espace VIP") |
| desc | tekst | Volledige klantgerichte beschrijving |
| duration | getal (minuten) | Geschatte duur |
| priceUsd | getal | Totaalprijs in USD |
| depositUsd | getal | Vereiste aanbetaling in USD |

### 6.3 Entiteit: Aanvraag/Boeking (`Request`)

| Veld | Type | Omschrijving |
|---|---|---|
| id | tekst | Referentienummer (bv. "KINO-801", "TICKET-N3", "SUR-PLACE") |
| clientName | tekst | Voornaam van de klant |
| rawPhone | tekst | WhatsApp-nummer (ongemaskeerd; wordt client-side gemaskeerd getoond aan personeel) |
| service | tekst | Naam van de gekozen dienst (inclusief "[VIP]"-vermelding indien van toepassing) |
| date / time | tekst | Gewenste datum en tijdstip, of "Aujourd'hui"/"Maintenant" voor walk-ins |
| status | enum | `PENDING_APPROVAL`, `APPROVED_WAITING_PAYMENT`, `CONFIRMED` |
| depositCdf | getal | Vereiste aanbetaling, omgerekend naar CDF |
| ref | tekst | Betalingsreferentie (leeg tot bevestiging) |
| isVip | boolean | Geeft aan of de VIP-optie is gekozen |

> **Opmerking.** Dit datamodel bestaat enkel als JavaScript-objecten in het geheugen van de browser. Er is geen backend-API, geen database en geen enkele vorm van datapersistentie tussen sessies.

---

## 7. Belangrijkste gebruikersflows

### 7.1 Flow: Klant reserveert met afspraak

1. Klant kiest hoofdcategorie (Beauté of Horeca) en zoekt/filtert op gemeente of trefwoord.
2. Klant klikt op "Avec RDV" bij een bedrijfskaart.
3. Klant kiest dienst/tafel, eventueel medewerker, eventueel VIP-optie, datum en tijdstip.
4. Klant vult naam en WhatsApp-nummer in en verstuurt de (gratis) aanvraag.
5. De aanvraag verschijnt bij de zaak als "En attente de validation".
6. De zaak valideert (klant krijgt 30 minuten om de aanbetaling via M-Pesa te betalen) of weigert (aanvraag verdwijnt).

### 7.2 Flow: Klant neemt een ticket zonder afspraak

1. Klant klikt op "Sans RDV" bij een bedrijfskaart.
2. Klant vult naam, WhatsApp-nummer en gewenste dienst in.
3. Systeem kent onmiddellijk een volgnummer toe en bevestigt de plaats in de wachtrij — geen validatie, geen aanbetaling nodig.

### 7.3 Flow: Zaak verwerkt inkomende aanvragen

1. Eigenaar/personeel opent "Espace Salon / Horeca" → tabblad "Demandes & Agenda".
2. Systeem toont alle aanvragen, met telefoonnummers gemaskeerd indien de rol "Personnel" actief is.
3. Voor elke aanvraag in afwachting: valideren of weigeren.
4. Na validatie: het systeem informeert (in de simulatie via een pop-up) dat de klant een WhatsApp-bericht ontvangt met een betaaltermijn van 30 minuten.

### 7.4 Flow: Zaak beheert haar catalogus

1. Eigenaar opent tabblad "Gérer le Catalogue & Tarifs".
2. Eigenaar klikt "Ajouter un Service" en vult naam, categorie, beschrijving, duur, prijs en aanbetaling in.
3. De nieuwe dienst is onmiddellijk beschikbaar, zowel in het dashboard als in het klantreserveringsformulier.

---

## 8. Niet-functionele aspecten van het huidige prototype

| Aspect | Huidige situatie |
|---|---|
| Taal van de interface | Volledig Frans (`lang="fr"`), gericht op de Franstalige markt van Kinshasa/Lubumbashi |
| Responsiviteit | Mobiel-eerst opgebouwd met Tailwind CSS-grids en flex-layouts; werkt op smartphone-schermgroottes |
| Technologie | Eén statisch HTML-bestand; Tailwind CSS via CDN (Play CDN, niet geschikt voor productie); Font Awesome 6.4.0 via CDN; vanilla JavaScript zonder framework of build-tool |
| Persistentie | Geen: alle data leeft enkel in JavaScript-geheugen en gaat verloren bij het herladen van de pagina |
| Beveiliging/authenticatie | Geen; rollen worden gesimuleerd via een dropdown zonder wachtwoord of sessiebeheer |
| Betalingen | Geen echte betaalintegratie; M-Pesa wordt enkel tekstueel vermeld als het kanaal waarlangs de klant rechtstreeks aan de zaak betaalt |
| Notificaties | Geen echte WhatsApp-integratie; berichten worden gesimuleerd via `alert()`-pop-ups |

---

## 9. Bekende beperkingen van het prototype

Deze sectie is essentieel voor een correcte scoping van vervolgwerk: het gaat om zaken die in de gebruikersinterface **beloofd of gesuggereerd** worden, maar die in de code **niet echt geïmplementeerd** zijn.

1. **Geen echte betaalintegratie.** Aanbetalingsbedragen worden berekend en getoond, maar er is geen koppeling met M-Pesa of een andere betaalprovider. Betaling en bevestiging ervan gebeuren buiten het systeem om.
2. **Geen echte WhatsApp-integratie.** Alle vermeldingen van "WhatsApp-bericht versturen" (bij validatie, bij de marketing-automatisering, bij walk-in tickets) zijn in werkelijkheid enkel `alert()`-meldingen in de browser.
3. **Geen countdown/automatische annulering.** De "30 minuten betaaltermijn" na validatie is een statisch label; er is geen tijdklok die de aanvraag automatisch annuleert bij het verstrijken van de termijn.
4. **Geen echte agenda/beschikbaarheidscontrole.** Tijdsloten (10:00, 12:00, 14:30, 17:00) zijn vast en identiek voor elk bedrijf en elke dag; er wordt niet gecontroleerd of een slot al bezet is.
5. **Catalogusbeheer werkt slechts op één bedrijf.** Nieuwe diensten worden altijd toegevoegd aan het eerste bedrijf in de lijst (`businesses[0]`), ongeacht welke zaak in de klantweergave werd bekeken.
6. **Geen authenticatie of autorisatie.** Elke bezoeker kan vrij schakelen tussen klant-, dashboard- en adminweergave, en de rol "Gérant" vs. "Personnel" kiezen zonder enige controle.
7. **Willekeurige/onveilige ID-generatie.** Referentienummers (bv. "KINO-801") worden willekeurig gegenereerd zonder controle op uniciteit of koppeling aan een echte database.
8. **Vaste wisselkoers.** De koers USD/CDF is hardcoded (2.850) en wordt niet automatisch bijgewerkt.
9. **Geen echte PDF-generatie.** De knop "Télécharger la Version A4 Imprimable (PDF)" toont enkel een bevestigingsmelding; er wordt geen bestand gegenereerd of gedownload.
10. **Geen datapersistentie.** Alle wijzigingen (nieuwe aanvragen, nieuwe diensten, statusupdates) bestaan enkel in het geheugen van de browsertab en verdwijnen bij een pagina-herlading.

---

## 10. Aanbevelingen voor doorontwikkeling

Op basis van bovenstaande analyse worden de volgende bouwstenen aanbevolen om van het prototype een productieklaar systeem te maken. Dit zijn **aanbevelingen**, geen bestaande functionaliteit:

1. **Backend & database**: een centrale API (bv. REST/GraphQL) met een echte database (bedrijven, diensten, gebruikers, aanvragen) zodat gegevens niet meer verloren gaan.
2. **Authenticatie & autorisatie**: echte login voor eigenaars/personeel/platformbeheer, met rolgebaseerde toegangscontrole in plaats van een vrije dropdown.
3. **Betaalintegratie**: koppeling met M-Pesa (of andere lokale mobiele-geldproviders) voor het verifiëren van aanbetalingen, inclusief automatische bevestiging/annulering na de betaaltermijn.
4. **WhatsApp Business API-integratie**: voor échte automatische berichten bij validatie, walk-in tickets en de 30-dagen-heractiveringscampagne.
5. **Echte agendabeheer**: dynamische beschikbaarheid per medewerker/tafel, met conflictdetectie bij het boeken van tijdsloten.
6. **Multi-tenant catalogusbeheer**: elke zaak moet haar eigen, geïsoleerde catalogus kunnen beheren (in plaats van alles aan één hardcoded bedrijf te koppelen).
7. **Live wisselkoers**: periodieke actualisatie van de USD/CDF-koers via een externe bron in plaats van een vaste waarde.
8. **Echte PDF-generatie** voor de QR-wachtrijposter.
9. **Beveiliging van persoonsgegevens**: de bestaande "personeel ziet geen volledig nummer"-logica moet serverside afgedwongen worden (niet enkel client-side gemaskeerd, wat te omzeilen is via de browserconsole).
10. **Audit- en facturatiemodule** voor het platformbeheer, zodat de cijfers in het "Admin SaaS"-scherm op echte transacties gebaseerd zijn in plaats van statische voorbeeldwaarden.

---

## 11. User Stories

Deze user stories vertalen de functionele vereisten (sectie 4) naar het klassieke "Als … wil ik … zodat …"-formaat, per gebruikersrol. Elke story krijgt een status:

- **MVP** = noodzakelijk voor een eerste lanceerbare versie met een echte pilootzaak.
- **MVP (ontbreekt)** = hoort bij de MVP-scope, maar is in het huidige prototype nog niet echt geïmplementeerd (enkel UI of simulatie).
- **Later** = wenselijk, maar bewust uitgesteld tot na de MVP.
- **Geschrapt voor v1** = staat wel in het prototype, maar wordt aanbevolen om uit de eerste lanceerbare versie te laten.

### 11.1 Eindklant (consument)

| ID | User story | Status |
|---|---|---|
| US-C1 | Als klant wil ik zaken kunnen zoeken en filteren op categorie (Beauté/Horeca) en gemeente, zodat ik snel een relevante zaak vind. | MVP – grotendeels aanwezig |
| US-C2 | Als klant wil ik het dienstenaanbod en de prijzen van een zaak kunnen bekijken vóór ik boek, zodat ik weet wat ik kan verwachten. | MVP – aanwezig |
| US-C3 | Als klant wil ik een gratis, vrijblijvende boekingsaanvraag kunnen indienen voor een dienst op een gekozen datum en tijdstip, zodat ik niet vooraf moet betalen voor iets dat nog niet bevestigd is. | MVP (ontbreekt: enkel UI, geen backend) |
| US-C4 | Als klant wil ik een virtueel ticket kunnen nemen voor de wachtrij zonder afspraak, zodat ik niet fysiek moet aanschuiven. | MVP (ontbreekt: enkel UI, geen live volgnummer) |
| US-C5 | Als klant wil ik een WhatsApp-bevestiging krijgen zodra mijn aanvraag gevalideerd is of mijn beurt in de wachtrij nadert, zodat ik weet wanneer ik moet komen. | MVP (ontbreekt volledig – nu enkel `alert()`) |
| US-C6 | Als klant wil ik zien hoeveel aanbetaling ik moet betalen en via welk kanaal (M-Pesa-nummer van de zaak), zodat ik mijn afspraak kan bevestigen. | MVP – UI aanwezig |
| US-C7 | Als klant wil ik een account kunnen aanmaken en inloggen, zodat ik mijn boekingsgeschiedenis kan terugvinden. | Later – gast-boeking (naam + WhatsApp-nummer, zonder account) volstaat voor de MVP |
| US-C8 | Als klant wil ik een discrete/VIP-reservering kunnen kiezen, zodat mijn bezoek privé blijft. | Geschrapt voor v1 |
| US-C9 | Als klant wil ik een voorkeursmedewerker kunnen kiezen, zodat ik steeds door dezelfde persoon geholpen word. | Later |

### 11.2 Zaakeigenaar / Gérant

| ID | User story | Status |
|---|---|---|
| US-O1 | Als eigenaar wil ik kunnen inloggen op een beveiligd dashboard, zodat enkel ik en mijn personeel toegang hebben tot de gegevens van mijn zaak. | MVP (ontbreekt volledig) |
| US-O2 | Als eigenaar wil ik alle inkomende boekingsaanvragen in één overzicht zien, zodat ik niets mis. | MVP – UI aanwezig |
| US-O3 | Als eigenaar wil ik een aanvraag kunnen valideren of weigeren, zodat ik enkel bevestig wat ik ook effectief kan uitvoeren. | MVP (ontbreekt: UI aanwezig, geen backend) |
| US-O4 | Als eigenaar wil ik dat de klant automatisch een WhatsApp-bericht krijgt na validatie, zodat die weet dat er betaald moet worden. | MVP (ontbreekt volledig – nu enkel `alert()`) |
| US-O5 | Als eigenaar wil ik kunnen zien (of manueel bevestigen) welke aanbetalingen binnengekomen zijn, zodat ik weet welke boekingen definitief zijn. | MVP (ontbreekt volledig) |
| US-O6 | Als eigenaar wil ik zelf mijn dienstenaanbod (naam, beschrijving, duur, prijs, aanbetaling) kunnen beheren, zodat ik niet afhankelijk ben van een ontwikkelaar. | MVP (ontbreekt: werkt nu enkel op één hardcoded zaak) |
| US-O7 | Als eigenaar of personeelslid wil ik snel een walk-in-klant aan de wachtrij kunnen toevoegen, zodat ook wie ter plaatse komt mee opgenomen wordt. | MVP – UI aanwezig |
| US-O8 | Als eigenaar wil ik zelf de maximale reactietermijn voor aanvragen instellen, zodat klanten weten wanneer ze ten laatste antwoord krijgen. | MVP – UI aanwezig |
| US-O9 | Als eigenaar wil ik mijn personeel toegang geven tot het dashboard zonder dat zij de volledige telefoonnummers van klanten zien, zodat mijn klantenbestand beschermd is tegen diefstal. | Later (belangrijk, maar server-side afdwingen komt na de kernflow) |
| US-O10 | Als eigenaar wil ik een QR-code kunnen ophangen aan mijn deur zodat klanten zelf een ticket kunnen nemen zonder personeel nodig te hebben. | Geschrapt voor v1 |
| US-O11 | Als eigenaar wil ik oude klanten automatisch laten heractiveren via WhatsApp na 30 dagen, zodat ik zelf minder marketinginspanning moet leveren. | Geschrapt voor v1 |

### 11.3 Personeelslid

| ID | User story | Status |
|---|---|---|
| US-S1 | Als personeelslid wil ik dezelfde aanvragenlijst zien als de eigenaar, zodat ik klanten kan bedienen zonder de eigenaar te moeten storen. | MVP – UI aanwezig |
| US-S2 | Als personeelslid wil ik géén volledig telefoonnummer van klanten zien, zodat ik hen niet buiten de zaak om kan contacteren. | Later (nu enkel client-side gesimuleerd, niet afgedwongen) |
| US-S3 | Als personeelslid wil ik zelf een walk-in-klant aan de wachtrij kunnen toevoegen, zodat ik snel kan werken aan de balie. | MVP – UI aanwezig |

### 11.4 Platformbeheerder (KinoBooking)

| ID | User story | Status |
|---|---|---|
| US-A1 | Als platformbeheerder wil ik nieuwe zaken kunnen registreren/onboarden op het platform, zodat ik nieuwe klanten (zaken) kan toevoegen zonder code aan te passen. | MVP (ontbreekt volledig – nu hardcoded in de broncode) |
| US-A2 | Als platformbeheerder wil ik zien welk abonnement en welke opties elke zaak afneemt, zodat ik mijn omzet kan opvolgen. | Geschrapt voor v1 (kan manueel opgevolgd worden, bv. in een spreadsheet) |
| US-A3 | Als platformbeheerder wil ik automatisch kunnen factureren voor abonnementen en opties, zodat ik niet manueel moet innen. | Geschrapt voor v1 |

---

## 12. MVP-scope en statusanalyse

Deze sectie geeft een eerlijke inschatting van hoever het huidige prototype staat ten opzichte van een lanceerbare MVP, en wat er bewust uit de scope van v1 gehaald wordt.

### 12.1 Uitgangspunt

De kernwaarde van KinoBooking zit in twee dingen: **(1)** een klant kan gratis een aanvraag indienen of een ticket nemen zonder aan te schuiven, en **(2)** de zaak kan die aanvragen centraal beheren en een aanbetaling afdwingen om no-shows te beperken. Een MVP moet dit kunnen bewijzen met **minstens één echte pilootzaak** in Kinshasa. Alles wat daar niet direct toe bijdraagt (monetisatie-add-ons, een intern SaaS-dashboard, marketingautomatisering) hoort niet thuis in v1.

### 12.2 Status per onderdeel

| Onderdeel | Nodig voor MVP? | Status vandaag | Wat ontbreekt nog | Geschat % klaar |
|---|---|---|---|---|
| Klant zoekt/bekijkt zaak & diensten | Ja | UI werkt, met mockdata | Echte data uit een database, meerdere zaken beheerbaar | 40% |
| Aanvraag met afspraak indienen | Ja (kern) | UI + berekening werkt | Backend-opslag, echte beschikbaarheidscheck | 30% |
| Ticket zonder afspraak (wachtrij) | Ja (kern, onderscheidend) | UI werkt | Backend, live volgnummer, echte notificatie | 25% |
| Dashboard: aanvragen valideren/weigeren | Ja (kern) | UI werkt | Persistente data, echte login | 30% |
| Aanbetaling verifiëren (M-Pesa) | Ja (kritiek voor het verdienmodel) | Enkel bedrag tonen | Integratie óf manueel bevestigingsproces | 5% |
| WhatsApp-notificaties (validatie, ticket, betaalherinnering) | Ja (kern voor UX) | Gesimuleerd met `alert()` | Echte koppeling (of minstens `wa.me`-links) | 5% |
| Login/auth voor eigenaar & personeel | Ja (basisveiligheid) | Onbestaand | Volledige implementatie | 0% |
| Catalogusbeheer (diensten toevoegen) | Ja, eenvoudig | UI werkt, maar hardcoded op 1 bedrijf | Multi-tenant, backend-opslag | 25% |
| Rol personeel vs. eigenaar (nummer maskeren) | Wenselijk, niet blokkerend | UI-simulatie werkt | Server-side afdwingen | 40%, lage prioriteit |
| QR-wachtrijposter + PDF-download | Nee | Simulatie | Alles | Geschrapt voor v1 |
| WhatsApp-marketing na 30 dagen | Nee | Simulatie | Alles | Geschrapt voor v1 |
| VIP/discrete reserveringsoptie | Nee (later) | UI werkt | Backend, aparte betaallogica | Geschrapt voor v1 |
| Admin SaaS / monetisatie-dashboard | Nee (intern, geen klantfeature) | UI werkt | Alles | Geschrapt voor v1 |
| Voorkeur-medewerker kiezen | Wenselijk, niet blokkerend | UI werkt | Backend | Lage prioriteit |
| Live USD/CDF-koers | Nee, hardcoded volstaat | Vast getal | API-koppeling | Lage prioriteit |
| Meerdere steden (Lubumbashi) | Nee, focus eerst op Kinshasa | UI werkt | — | Uitstellen |

### 12.3 Wat concreet uit de v1-scope moet, en waarom

- **Admin SaaS-scherm** – intern hulpmiddel voor KinoBooking zelf, geen klantfeature. Omzet kan de eerste maanden manueel bijgehouden worden.
- **WhatsApp-marketingautomatisering (30 dagen)** – een retentiefunctie die niets bewijst over de kernvraag "werkt boeken + wachtrij in de praktijk?".
- **QR-poster/PDF-download** – kan voorlopig manueel (een geprint blad met een link) in plaats van een gebouwde functie.
- **VIP/discrete optie** – voegt betaalcomplexiteit toe zonder de kernflow te versterken.
- **Voorkeur-medewerker** – comfortfunctie, geen blokkade voor lancering.
- **Meerdere steden** – onnodige complexiteit zolang er met één of enkele pilootzaken in Kinshasa gewerkt wordt.

Dit betekent niet dat deze onderdelen uit de code moeten verdwijnen — ze mogen op de branch blijven staan — maar ze horen niet tot de scope die eerst afgewerkt en getest wordt.

### 12.4 Eerlijk totaalcijfer

**Grofweg 15–20% van het effectieve MVP-werk is vandaag gerealiseerd.** Dat lijkt laag in verhouding tot hoe "af" de applicatie er visueel uitziet, maar dat is de valkuil van een klikbaar HTML/JS-prototype: de gebruikersinterface is doorgaans het makkelijkste deel van dit soort applicatie. Backend, database, authenticatie, betaalverificatie en messaging-integratie vertegenwoordigen typisch 70–80% van het totale ontwikkelwerk voor een applicatie als deze, en daar staat de teller momenteel nog op 0%.

### 12.5 Prioriteitenlijst om tot een lanceerbare MVP te komen

1. **Backend + database** – bedrijven, diensten, aanvragen en gebruikers persistent opslaan.
2. **Login/authenticatie** voor eigenaar en personeel.
3. **Aanbetaling** – pragmatisch beginnen: geen volledige M-Pesa-API (traag en administratief zwaar om goedgekeurd te krijgen), maar een "ik heb betaald"-bevestiging die de eigenaar manueel afvinkt na controle in zijn eigen M-Pesa-app.
4. **Notificaties** – starten met `wa.me`-links (opent WhatsApp met een vooraf ingevulde tekst) in plaats van de volledige WhatsApp Business API, die een goedkeuringstraject vereist.
5. **Eén echte pilootzaak** live zetten met echte gegevens in plaats van mockdata.
6. **Echte hosting voor de backend** – GitHub Pages volstaat enkel voor de huidige statische front-end, niet zodra er een database/API bijkomt.

---

## 13. Bijlage: Overzicht prijsmodel (zoals getoond in het Admin SaaS-scherm)

| Onderdeel | Prijs | Toelichting |
|---|---|---|
| Basisabonnement (bv. "Business Plan") | $49 / maand | Basistoegang tot het ondernemersdashboard |
| Optie: QR-wachtrijmodule | +$15 / maand | Inclusief afdrukbare A4-poster en live wachtrijbeheer voor walk-ins |
| Optie: Automatische WhatsApp-marketing | +$20 / maand | Automatische heractivatie van klanten na 30 dagen inactiviteit, zonder blootstelling van nummers aan personeel |
| Optie: Discrete/VIP-reservering | Inbegrepen in Business/Pro-abonnementen | Platform ontvangt bijkomend $3 à $5 servicekost per VIP-boeking, betaald door de eindklant |

---

*Dit document is opgesteld op basis van reverse-engineering van de broncode in `index.html` op de branch `claude/bookings-by-kino-aadqaq`, en weerspiegelt de staat van het prototype op 2026-09-07. Versie 1.1 (eveneens 2026-09-07) voegt user stories en een MVP-scope-analyse toe.*
