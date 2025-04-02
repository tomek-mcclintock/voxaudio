// src/app/privacy/german-policy.tsx
export default function GermanPrivacyPolicy() {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-lg shadow p-8">
            <div className="flex justify-between items-center mb-6">
              <h1 className="text-3xl font-bold">Datenschutzerklärung</h1>
              <div>
                <a href="/privacy?lang=en" className="text-sm text-blue-600 hover:underline">English</a>
              </div>
            </div>
            <p className="text-sm text-gray-500 mb-6">Letzte Aktualisierung: April 2025</p>
            
            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">1. Einleitung</h2>
              <p className="mb-4">
                VoxAudio Ltd („wir", „uns" oder „unser") verpflichtet sich, die Privatsphäre und Sicherheit Ihrer personenbezogenen Daten zu schützen. Diese Datenschutzerklärung beschreibt, wie wir Ihre Informationen erheben, verwenden, offenlegen und schützen, wenn Sie unsere Feedback-Erfassungsdienste (der „Dienst") nutzen.
              </p>
              <p className="mb-4">
                Wir handeln als Auftragsverarbeiter im Auftrag unserer Geschäftskunden (der „Kunde"), die unseren Dienst nutzen, um Feedback von ihren Kunden zu sammeln. Der Kunde ist der Verantwortliche in Bezug auf die über unseren Dienst erhobenen Informationen. Diese Datenschutzerklärung erläutert unsere Datenpraktiken sowie die Rechte und Auswahlmöglichkeiten, die den Personen zur Verfügung stehen, deren Daten wir verarbeiten.
              </p>
            </section>
  
            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">2. Informationen, die wir sammeln</h2>
              <p className="mb-4">
                Wir erheben und verarbeiten die folgenden Kategorien personenbezogener Daten über unseren Dienst:
              </p>
              <div className="ml-6 mb-4">
                <h3 className="font-semibold mb-2">2.1 Feedback-Daten</h3>
                <ul className="list-disc pl-6 mb-4 space-y-2">
                  <li>Bewertungen und Punktzahlen (wie Net Promoter Score)</li>
                  <li>Sprachaufnahmen (wenn Sie Sprach-Feedback geben möchten)</li>
                  <li>Transkriptionen von Sprachfeedback</li>
                  <li>Textbasiertes Feedback und Kommentare</li>
                  <li>Antworten auf Umfragefragen</li>
                </ul>
  
                <h3 className="font-semibold mb-2">2.2 Identifikationsinformationen</h3>
                <ul className="list-disc pl-6 mb-4 space-y-2">
                  <li>Referenznummern (wie Bestellnummern, Ticketnummern oder Kundenidentifikatoren)</li>
                  <li>Sitzungsidentifikatoren</li>
                  <li>Technische Identifikatoren, die zur Bereitstellung des Dienstes erforderlich sind</li>
                </ul>
  
                <h3 className="font-semibold mb-2">2.3 Technische Informationen</h3>
                <ul className="list-disc pl-6 mb-4 space-y-2">
                  <li>IP-Adresse</li>
                  <li>Browsertyp und -version</li>
                  <li>Geräteinformationen</li>
                  <li>Betriebssystem</li>
                  <li>Zeitstempel und Datum der Feedback-Übermittlung</li>
                </ul>
              </div>
              <p className="mb-4">
                Wir sammeln nicht wissentlich personenbezogene Daten von Personen unter 16 Jahren. Wenn Sie unter 16 Jahre alt sind, geben Sie uns bitte keine personenbezogenen Daten.
              </p>
            </section>
  
            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">3. Wie wir Ihre Informationen verwenden</h2>
              <p className="mb-4">
                Wir verarbeiten Ihre Informationen für die folgenden Zwecke:
              </p>
              <ul className="list-disc pl-6 mb-4 space-y-2">
                <li>Um unseren Kunden Dienste zur Feedback-Erfassung und -Analyse bereitzustellen</li>
                <li>Um Sprachaufnahmen mithilfe automatisierter Prozesse in Text zu transkribieren</li>
                <li>Um Feedback-Inhalte und Stimmungen zu analysieren, um Erkenntnisse und Berichte zu generieren</li>
                <li>Um Trends, Muster und Themen im Feedback zu identifizieren</li>
                <li>Um unseren Kunden zu ermöglichen, ihre Produkte, Dienstleistungen und Kundenerfahrung zu verbessern</li>
                <li>Um unseren Dienst zu erhalten und zu verbessern</li>
                <li>Um gesetzlichen Verpflichtungen nachzukommen</li>
                <li>Um die Sicherheit und Integrität unseres Dienstes zu schützen</li>
              </ul>
              <p className="mb-4">
                Die Rechtsgrundlage für die Verarbeitung Ihrer personenbezogenen Daten variiert je nach Art der Verarbeitung und den geltenden Gesetzen, umfasst aber in der Regel:
              </p>
              <ul className="list-disc pl-6 mb-4 space-y-2">
                <li>Berechtigte Interessen unserer Kunden (wie das Verständnis der Kundenzufriedenheit und die Verbesserung ihrer Produkte und Dienstleistungen)</li>
                <li>Ihre Einwilligung, die Sie bei der Übermittlung von Feedback geben</li>
                <li>Erfüllung von Verträgen, an denen unsere Kunden beteiligt sind</li>
                <li>Einhaltung gesetzlicher Verpflichtungen</li>
              </ul>
            </section>
  
            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">4. Wie wir Ihre Informationen verarbeiten</h2>
              <p className="mb-4">
                Ihr Feedback wird mit verschiedenen Technologien und Methoden verarbeitet:
              </p>
              <ul className="list-disc pl-6 mb-4 space-y-2">
                <li>Sprachaufnahmen werden mithilfe von maschinellen Lerntechnologien transkribiert, einschließlich Transkriptionsdiensten von Drittanbietern</li>
                <li>Die Feedback-Analyse erfolgt mithilfe künstlicher Intelligenz und natürlicher Sprachverarbeitung</li>
                <li>Feedback-Daten werden in sicheren Cloud-basierten Datenbanken mit angemessenen Zugangskontrollen gespeichert</li>
                <li>Wir setzen Analysetechnologien ein, um Muster und Erkenntnisse in aggregierten Feedback-Daten zu identifizieren</li>
              </ul>
              <p className="mb-4">
                Die gesamte Datenverarbeitung erfolgt in Übereinstimmung mit den geltenden Datenschutzgesetzen und mit angemessenen Sicherheitsmaßnahmen.
              </p>
            </section>
  
            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">5. Offenlegung Ihrer Informationen</h2>
              <p className="mb-4">
                Wir können Ihre Informationen unter folgenden Umständen weitergeben:
              </p>
              <ul className="list-disc pl-6 mb-4 space-y-2">
                <li><strong>Mit unseren Kunden:</strong> Wir teilen das von Ihnen gegebene Feedback mit der Kundenorganisation, die das Feedback angefordert hat.</li>
                <li><strong>Dienstleister:</strong> Wir beauftragen vertrauenswürdige Drittanbieter, um Funktionen auszuführen und uns Dienste bereitzustellen, wie Cloud-Hosting, Datenanalyse, Transkriptionsdienste und Kundensupport. Diese Dienstleister haben nur Zugriff auf Ihre Informationen, um diese Aufgaben in unserem Auftrag auszuführen.</li>
                <li><strong>Geschäftsübertragungen:</strong> Wenn wir an einer Fusion, Übernahme, Finanzierung oder einem Verkauf von Geschäftsvermögen beteiligt sind, können Ihre Informationen im Rahmen dieser Transaktion übertragen werden.</li>
                <li><strong>Gesetzliche Anforderungen:</strong> Wir können Ihre Informationen offenlegen, wenn dies gesetzlich vorgeschrieben ist oder als Reaktion auf gültige Anfragen von Behörden.</li>
                <li><strong>Mit Ihrer Einwilligung:</strong> Wir können Ihre Informationen mit Dritten teilen, wenn wir Ihre Einwilligung dazu haben.</li>
              </ul>
            </section>
  
            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">6. Internationale Datenübertragungen</h2>
              <p className="mb-4">
                Ihre Daten können in Länder übertragen und dort verarbeitet werden, die nicht Ihr Wohnsitzland sind. Diese Länder können Datenschutzgesetze haben, die sich von denen Ihres Landes unterscheiden.
              </p>
              <p className="mb-4">
                Insbesondere befinden sich unsere Server in verschiedenen Regionen, und wir nutzen Dienstleister, die sich in verschiedenen Ländern befinden können. Dies bedeutet, dass wir bei der Erhebung Ihrer personenbezogenen Daten diese in einem dieser Länder verarbeiten können.
              </p>
              <p className="mb-4">
                Durch die Bereitstellung Ihres Feedbacks stimmen Sie dieser Übertragung, Speicherung und Verarbeitung zu. Wir ergreifen geeignete Schutzmaßnahmen, um sicherzustellen, dass Ihre personenbezogenen Daten im Einklang mit dieser Datenschutzerklärung geschützt bleiben, einschließlich der Implementierung von Standardvertragsklauseln für die Übertragung personenbezogener Daten zwischen unseren Konzernunternehmen und Drittanbietern, wo dies angemessen ist.
              </p>
            </section>
  
            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">7. Datensicherheit</h2>
              <p className="mb-4">
                Wir haben angemessene technische und organisatorische Maßnahmen implementiert, die darauf ausgelegt sind, die Sicherheit der von uns verarbeiteten personenbezogenen Daten zu schützen. Trotz unserer Schutzmaßnahmen ist kein Sicherheitssystem undurchdringlich, und aufgrund der inhärenten Natur des Internets können wir nicht garantieren, dass Informationen während der Übertragung oder während der Speicherung in unseren Systemen absolut sicher vor dem Eindringen Dritter sind.
              </p>
              <p className="mb-4">
                Unsere Sicherheitsmaßnahmen umfassen:
              </p>
              <ul className="list-disc pl-6 mb-4 space-y-2">
                <li>Verschlüsselung von Daten während der Übertragung und im Ruhezustand</li>
                <li>Regelmäßige Sicherheitsbewertungen unserer Systeme</li>
                <li>Zugangskontrollen und Authentifizierungsverfahren</li>
                <li>Regelmäßige Überwachung der Systeme auf mögliche Schwachstellen und Angriffe</li>
                <li>Geschäftskontinuitäts- und Notfallwiederherstellungspläne</li>
              </ul>
            </section>
  
            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">8. Datenspeicherung</h2>
              <p className="mb-4">
                Wir speichern Ihre personenbezogenen Daten nur so lange, wie es für die in dieser Datenschutzerklärung genannten Zwecke erforderlich ist oder um unseren gesetzlichen Verpflichtungen nachzukommen, Streitigkeiten beizulegen und unsere Vereinbarungen durchzusetzen.
              </p>
              <p className="mb-4">
                Die Kriterien zur Bestimmung unserer Aufbewahrungsfristen umfassen:
              </p>
              <ul className="list-disc pl-6 mb-4 space-y-2">
                <li>Die Dauer unserer Vertragsbeziehung mit unserem Kunden</li>
                <li>Ob eine gesetzliche Verpflichtung besteht, der wir unterliegen</li>
                <li>Ob eine Aufbewahrung im Hinblick auf unsere Rechtsposition ratsam ist (z. B. in Bezug auf geltende Verjährungsfristen, Rechtsstreitigkeiten oder behördliche Untersuchungen)</li>
              </ul>
              <p className="mb-4">
                Nach Ablauf der Aufbewahrungsfrist werden personenbezogene Daten in Übereinstimmung mit den geltenden Gesetzen gelöscht oder anonymisiert.
              </p>
            </section>
  
            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">9. Ihre Rechte</h2>
              <p className="mb-4">
                Je nach Ihrem Standort und vorbehaltlich des geltenden Rechts haben Sie möglicherweise die folgenden Rechte in Bezug auf Ihre personenbezogenen Daten:
              </p>
              <ul className="list-disc pl-6 mb-4 space-y-2">
                <li><strong>Zugang:</strong> Das Recht, Zugang zu Ihren personenbezogenen Daten zu verlangen</li>
                <li><strong>Berichtigung:</strong> Das Recht zu verlangen, dass wir ungenaue oder unvollständige personenbezogene Daten korrigieren</li>
                <li><strong>Löschung:</strong> Das Recht, die Löschung Ihrer personenbezogenen Daten unter bestimmten Umständen zu verlangen</li>
                <li><strong>Einschränkung:</strong> Das Recht zu verlangen, dass wir die Verarbeitung Ihrer personenbezogenen Daten unter bestimmten Umständen einschränken</li>
                <li><strong>Datenübertragbarkeit:</strong> Das Recht, Ihre personenbezogenen Daten in einem strukturierten, gängigen und maschinenlesbaren Format zu erhalten</li>
                <li><strong>Widerspruch:</strong> Das Recht, der Verarbeitung Ihrer personenbezogenen Daten unter bestimmten Umständen zu widersprechen</li>
                <li><strong>Einwilligung widerrufen:</strong> Wenn die Verarbeitung auf einer Einwilligung basiert, das Recht, Ihre Einwilligung jederzeit zu widerrufen</li>
                <li><strong>Beschwerde:</strong> Das Recht, eine Beschwerde bei einer Aufsichtsbehörde einzureichen</li>
              </ul>
              <p className="mb-4">
                Bitte beachten Sie, dass diese Rechte nicht absolut sind und nach geltendem Recht Einschränkungen unterliegen können. Da wir personenbezogene Daten als Dienstleister im Auftrag unserer Kunden verarbeiten, können wir Ihre Anfrage an den entsprechenden Kunden weiterleiten und ihm bei Bedarf bei der Beantwortung Ihrer Anfrage helfen.
              </p>
            </section>
  
            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">10. Dienste von Drittanbietern</h2>
              <p className="mb-4">
                Unser Dienst kann Dienste von Drittanbietern für Funktionen wie Datenanalyse, Sprachtranskription und Cloud-Speicherung verwenden. Diese Dritten können nur Zugriff auf Ihre personenbezogenen Daten haben, um diese Funktionen in unserem Auftrag auszuführen, und sind verpflichtet, diese nicht für andere Zwecke offenzulegen oder zu verwenden.
              </p>
              <p className="mb-4">
                Wir verwenden die folgenden Kategorien von Drittanbietern:
              </p>
              <ul className="list-disc pl-6 mb-4 space-y-2">
                <li>Cloud-Hosting- und Speicheranbieter</li>
                <li>KI- und Machine-Learning-Dienste für Transkription und Analyse</li>
                <li>Analysedienste</li>
                <li>Datenbankverwaltungsdienste</li>
                <li>Customer-Relationship-Management-Tools</li>
              </ul>
              <p className="mb-4">
                Jeder dieser Dienstleister hat eigene Datenschutzrichtlinien, die ihre Verwendung personenbezogener Daten regeln.
              </p>
            </section>
  
            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">11. Änderungen dieser Datenschutzerklärung</h2>
              <p className="mb-4">
                Wir können diese Datenschutzerklärung von Zeit zu Zeit aktualisieren, um auf sich ändernde rechtliche, technische oder geschäftliche Entwicklungen zu reagieren. Wenn wir unsere Datenschutzerklärung aktualisieren, werden wir geeignete Maßnahmen ergreifen, um Sie zu informieren, entsprechend der Bedeutung der von uns vorgenommenen Änderungen.
              </p>
              <p className="mb-4">
                Wir werden Ihre Zustimmung zu wesentlichen Änderungen einholen, wenn und wo dies nach den geltenden Datenschutzgesetzen erforderlich ist. Sie können sehen, wann diese Datenschutzerklärung zuletzt aktualisiert wurde, indem Sie das Datum "Letzte Aktualisierung" am Anfang dieser Seite überprüfen.
              </p>
            </section>
  
            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">12. Kontaktieren Sie uns</h2>
              <p className="mb-4">
                Wenn Sie Fragen oder Bedenken zu dieser Datenschutzerklärung oder unseren Datenpraktiken haben, kontaktieren Sie uns bitte unter:
              </p>
              <div className="mb-4">
                <p>Datenschutzteam</p>
                <p>VoxAudio Ltd</p>
                <p>E-Mail: <a href="mailto:voxaudiofeedback@gmail.com" className="text-blue-600 hover:underline">voxaudiofeedback@gmail.com</a></p>
              </div>
              <p className="mb-4">
                Wir werden auf Ihre Anfragen so schnell wie möglich und innerhalb der gesetzlich vorgeschriebenen Fristen antworten.
              </p>
            </section>
  
            <footer className="mt-12 pt-6 border-t border-gray-200 text-sm text-gray-600">
              <p className="mb-2">© 2025 VoxAudio Ltd. Alle Rechte vorbehalten.</p>
              <p>Diese Datenschutzerklärung dient nur zu Informationszwecken und stellt keine Rechtsberatung dar.</p>
            </footer>
          </div>
        </div>
      </div>
    );
  }