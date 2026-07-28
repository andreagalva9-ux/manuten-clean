/*
 * `Image` qui è il primitivo di @react-pdf/renderer, non un <img> HTML:
 * non accetta `alt` e non finisce mai in un DOM, quindi la regola non si applica.
 */
/* eslint-disable jsx-a11y/alt-text */
import {
  Document,
  Image,
  Page,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";

import { AZIENDA, codiceCommessa, formattaData, formattaOre } from "@/lib/dominio";

export type DatiFoglio = {
  /** Data URI del logo (letto da public/logo.png dalla route che genera il PDF). */
  logoDataUri: string;
  numero: number;
  /** Totale interventi emessi per questo cliente+tipo (inclusi gli eliminati): riproduce il "N° X di Y" del modulo cartaceo. */
  numeroTotaleCliente: number;
  tipo: string;
  data: string;
  ore: number | null;
  lavoroSvolto: string;
  note: string | null;
  personaContatto: string | null;
  materialiInstallati: string | null;
  areeIntervento: string | null;
  cliente: { nome: string; indirizzo: string | null } | null;
  compilatore: string;
  tecnici: string[];
  firmaTecnico: string | null;
  firmaCliente: string | null;
  eliminato: boolean;
};

const COLORE = {
  brand: "#086660",
  brandChiaro: "#eaf6f5",
  verde: "#649943",
  testo: "#0f172a",
  tenue: "#64748b",
  bordo: "#cbd5e1",
};

const stili = StyleSheet.create({
  pagina: {
    paddingTop: 32,
    paddingBottom: 40,
    paddingHorizontal: 36,
    fontSize: 10,
    fontFamily: "Helvetica",
    color: COLORE.testo,
  },

  testata: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 2,
    borderBottomColor: COLORE.brand,
    paddingBottom: 10,
    marginBottom: 14,
  },
  logo: { width: 150, height: 33 },

  riquadroCommessa: {
    backgroundColor: COLORE.brandChiaro,
    borderWidth: 1,
    borderColor: COLORE.brand,
    borderRadius: 5,
    paddingVertical: 6,
    paddingHorizontal: 10,
    alignItems: "flex-end",
    minWidth: 140,
  },
  etichettaCommessa: {
    fontSize: 7,
    letterSpacing: 1,
    color: COLORE.brand,
    fontFamily: "Helvetica-Bold",
  },
  numeroCommessa: {
    fontSize: 18,
    fontFamily: "Helvetica-Bold",
    color: COLORE.brand,
    marginTop: 2,
  },
  progressivoCommessa: {
    fontSize: 8,
    color: COLORE.tenue,
    marginTop: 1,
  },

  titoloDocumento: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    marginBottom: 12,
  },

  sezione: {
    borderWidth: 1,
    borderColor: COLORE.bordo,
    borderRadius: 4,
    marginBottom: 10,
  },
  intestazioneSezione: {
    backgroundColor: "#f1f5f9",
    borderBottomWidth: 1,
    borderBottomColor: COLORE.bordo,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  etichettaSezione: {
    fontSize: 7.5,
    letterSpacing: 0.8,
    fontFamily: "Helvetica-Bold",
    color: COLORE.tenue,
  },
  corpoSezione: { paddingVertical: 7, paddingHorizontal: 8 },

  griglia: { flexDirection: "row", gap: 10, marginBottom: 10 },
  colonna: { flex: 1 },

  valoreForte: { fontSize: 11, fontFamily: "Helvetica-Bold" },
  valore: { fontSize: 10, lineHeight: 1.45 },
  valoreTenue: { fontSize: 9, color: COLORE.tenue, marginTop: 2 },

  bloccoFirme: { flexDirection: "row", gap: 20, marginTop: 18 },
  firma: { flex: 1 },
  areaFirma: {
    height: 58,
    borderBottomWidth: 1,
    borderBottomColor: COLORE.testo,
    justifyContent: "flex-end",
    alignItems: "center",
    paddingBottom: 2,
  },
  immagineFirma: { height: 52, objectFit: "contain" },
  etichettaFirma: {
    fontSize: 8,
    color: COLORE.tenue,
    marginTop: 4,
    textAlign: "center",
  },

  filigranaEliminato: {
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#fca5a5",
    backgroundColor: "#fef2f2",
    color: "#991b1b",
    borderRadius: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
    fontSize: 8.5,
  },

  // Nota: niente `position: absolute` + `fixed` qui. react-pdf perde
  // silenziosamente un footer così posizionato quando il contenuto della
  // pagina si avvicina al margine inferiore (verificato empiricamente).
  // Il footer resta quindi nel flusso normale, subito dopo le firme.
  pie: {
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: COLORE.bordo,
    paddingTop: 6,
    fontSize: 7,
    color: COLORE.tenue,
    lineHeight: 1.4,
  },
  pieCommessa: {
    marginTop: 3,
    fontFamily: "Helvetica-Bold",
  },
});

function Sezione({
  titolo,
  children,
}: {
  titolo: string;
  children: React.ReactNode;
}) {
  return (
    <View style={stili.sezione} wrap={false}>
      <View style={stili.intestazioneSezione}>
        <Text style={stili.etichettaSezione}>{titolo.toUpperCase()}</Text>
      </View>
      <View style={stili.corpoSezione}>{children}</View>
    </View>
  );
}

export function FoglioLavoroPDF({ dati }: { dati: DatiFoglio }) {
  const codice = codiceCommessa(dati.tipo, dati.numero);

  return (
    <Document
      title={`Foglio di lavoro ${codice}`}
      author={AZIENDA.nome}
      subject={dati.tipo}
    >
      <Page size="A4" style={stili.pagina}>
        <View style={stili.testata} fixed>
          <Image style={stili.logo} src={dati.logoDataUri} />

          <View style={stili.riquadroCommessa}>
            <Text style={stili.etichettaCommessa}>N. COMMESSA</Text>
            <Text style={stili.numeroCommessa}>{codice}</Text>
            <Text style={stili.progressivoCommessa}>
              Intervento n. {dati.numero} di {dati.numeroTotaleCliente}
            </Text>
          </View>
        </View>

        <Text style={stili.titoloDocumento}>Foglio di lavoro</Text>

        {dati.eliminato && (
          <Text style={stili.filigranaEliminato}>
            Documento eliminato dall&apos;archivio. Il numero di commessa resta
            riservato e non viene riassegnato.
          </Text>
        )}

        <Sezione titolo="Cliente">
          <Text style={stili.valoreForte}>
            {dati.cliente?.nome ?? "Cliente non disponibile"}
          </Text>
          {dati.cliente?.indirizzo ? (
            <Text style={stili.valoreTenue}>{dati.cliente.indirizzo}</Text>
          ) : null}
        </Sezione>

        <View style={stili.griglia}>
          <View style={stili.colonna}>
            <Sezione titolo="Servizio">
              <Text style={stili.valore}>{dati.tipo}</Text>
            </Sezione>
          </View>
          <View style={stili.colonna}>
            <Sezione titolo="Data">
              <Text style={stili.valoreForte}>{formattaData(dati.data)}</Text>
            </Sezione>
          </View>
          <View style={stili.colonna}>
            <Sezione titolo="Ore">
              <Text style={stili.valoreForte}>{formattaOre(dati.ore)}</Text>
            </Sezione>
          </View>
        </View>

        {(dati.materialiInstallati || dati.areeIntervento) && (
          <View style={stili.griglia}>
            {dati.materialiInstallati ? (
              <View style={stili.colonna}>
                <Sezione titolo="Materiali installati">
                  <Text style={stili.valore}>{dati.materialiInstallati}</Text>
                </Sezione>
              </View>
            ) : null}
            {dati.areeIntervento ? (
              <View style={stili.colonna}>
                <Sezione titolo="Aree d'intervento">
                  <Text style={stili.valore}>{dati.areeIntervento}</Text>
                </Sezione>
              </View>
            ) : null}
          </View>
        )}

        <Sezione titolo="Lavoro svolto / osservazioni del tecnico">
          <Text style={stili.valore}>{dati.lavoroSvolto}</Text>
        </Sezione>

        {dati.note ? (
          <Sezione titolo="Note">
            <Text style={stili.valore}>{dati.note}</Text>
          </Sezione>
        ) : null}

        <View style={stili.griglia}>
          <View style={stili.colonna}>
            <Sezione titolo="Tecnici intervenuti">
              <Text style={stili.valore}>
                {dati.tecnici.length > 0 ? dati.tecnici.join(", ") : "—"}
              </Text>
              <Text style={stili.valoreTenue}>
                Foglio compilato da {dati.compilatore}
              </Text>
            </Sezione>
          </View>
          {dati.personaContatto ? (
            <View style={stili.colonna}>
              <Sezione titolo="Persona da contattare">
                <Text style={stili.valore}>{dati.personaContatto}</Text>
              </Sezione>
            </View>
          ) : null}
        </View>

        <View style={stili.bloccoFirme} wrap={false}>
          <View style={stili.firma}>
            <View style={stili.areaFirma}>
              {dati.firmaTecnico ? (
                <Image style={stili.immagineFirma} src={dati.firmaTecnico} />
              ) : null}
            </View>
            <Text style={stili.etichettaFirma}>Firma del tecnico</Text>
          </View>

          <View style={stili.firma}>
            <View style={stili.areaFirma}>
              {dati.firmaCliente ? (
                <Image style={stili.immagineFirma} src={dati.firmaCliente} />
              ) : null}
            </View>
            <Text style={stili.etichettaFirma}>
              Firma del cliente per accettazione
            </Text>
          </View>
        </View>

        <View style={stili.pie}>
          <Text>
            {AZIENDA.nome} · {AZIENDA.indirizzo} · tel. {AZIENDA.telefono} ·
            fax. {AZIENDA.fax}
          </Text>
          <Text>
            R.E.A. {AZIENDA.rea} · Cod. Fisc. e P.iva {AZIENDA.piva} ·{" "}
            {AZIENDA.email} · PEC {AZIENDA.pec}
          </Text>
          <Text style={stili.pieCommessa}>Commessa {codice}</Text>
        </View>
      </Page>
    </Document>
  );
}
