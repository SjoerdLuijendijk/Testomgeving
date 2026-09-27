import Link from "next/link";
import { addNote } from "./actions";
import NotesView from "./NotesView";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<{ tab?: string | string[] }>;
};

export default async function Page({ searchParams }: PageProps) {
  const activeTab = (await searchParams).tab === "notes" ? "notes" : "new";

  return (
    <div className="app-shell">
      <header className="site-header">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true">N<span>.</span></span>
          <span className="brand-name">Notities</span>
        </div>
        <span className="header-caption">Jouw plek voor wat telt</span>
      </header>

      <main className="page-main">
        <nav className="view-menu" aria-label="Notitiemenu">
          <Link href="/?tab=new" aria-current={activeTab === "new" ? "page" : undefined}>
            <span aria-hidden="true">＋</span> Nieuwe notitie
          </Link>
          <Link href="/?tab=notes" aria-current={activeTab === "notes" ? "page" : undefined}>
            <span aria-hidden="true">▤</span> Mijn notities
          </Link>
        </nav>

        <div className="page-intro">
          <p className="eyebrow">{activeTab === "new" ? "SNEL VASTLEGGEN" : "JOUW OVERZICHT"}</p>
          <h1>
            {activeTab === "new" ? "Wat wil je bewaren" : "Alles wat je hebt bewaard"}
            <span className="title-dot">.</span>
          </h1>
          <p>
            {activeTab === "new"
              ? "Leg een gedachte vast en voeg er eventueel bestanden aan toe."
              : "Bekijk je notities, open bijlagen of neem alles mee als PDF."}
          </p>
        </div>

        <div className={activeTab === "new" ? "view-content view-content--new" : "view-content"}>
          {activeTab === "new" ? (
            <section className="compose-panel" aria-labelledby="compose-title">
              <div className="panel-heading">
                <span className="panel-icon" aria-hidden="true">＋</span>
                <div>
                  <p className="eyebrow">SNEL VASTLEGGEN</p>
                  <h2 id="compose-title">Nieuwe notitie</h2>
                </div>
              </div>
              <form action={addNote} className="compose-form">
                <label htmlFor="note-text">Jouw notitie</label>
                <textarea id="note-text" name="text" maxLength={500} placeholder="Wat wil je onthouden?" rows={6} required />
                <label htmlFor="note-files">Bijlagen</label>
                <input id="note-files" name="files" type="file" multiple />
                <p className="field-hint">Bestanden samen maximaal 4 MB.</p>
                <button className="primary-button" type="submit">Notitie opslaan <span aria-hidden="true">↗</span></button>
              </form>
            </section>
          ) : (
            <NotesView />
          )}
        </div>
      </main>
    </div>
  );
}
