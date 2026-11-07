import { lazy, Suspense } from 'react'
import { links, profile, projects } from './data'

// Code-split the 3D scene so the text renders immediately.
const Scene = lazy(() => import('./components/Scene'))

export default function App() {
  return (
    <>
      <header className="nav">
        <a href="#top" className="logo">FM</a>
        <nav>
          <a href="#about">About</a>
          <a href="#projects">Projects</a>
          <a href="#contact">Contact</a>
        </nav>
      </header>

      <main id="top">
        <section className="hero">
          <div className="hero-canvas" aria-hidden>
            <Suspense fallback={null}>
              <Scene />
            </Suspense>
          </div>
          <div className="hero-text">
            <p className="eyebrow">{profile.role}</p>
            <h1>{profile.name}</h1>
            <p className="tagline">{profile.tagline}</p>
            <div className="cta">
              <a className="btn primary" href="#projects">See my work</a>
              <a className="btn" href="#contact">Get in touch</a>
            </div>
          </div>
        </section>

        <section id="about" className="section">
          <h2>About</h2>
          {profile.about.map((p, i) => <p key={i}>{p}</p>)}
        </section>

        <section id="projects" className="section">
          <h2>Projects</h2>
          <div className="grid">
            {projects.map((p) => {
              const body = (
                <>
                  <h3>{p.title}</h3>
                  <p>{p.description}</p>
                  <ul className="tags">{p.tags.map((t) => <li key={t}>{t}</li>)}</ul>
                </>
              )
              return p.href ? (
                <a key={p.title} className="card" href={p.href} target="_blank" rel="noreferrer">{body}</a>
              ) : (
                <div key={p.title} className="card">{body}</div>
              )
            })}
          </div>
        </section>

        <section id="contact" className="section">
          <h2>Contact</h2>
          <p>
            Want to chat? Drop me a line at <a href={`mailto:${profile.email}`}>{profile.email}</a>.
          </p>
          <ul className="links">
            {links.map((l) => (
              <li key={l.label}>
                <a href={l.href} target="_blank" rel="noreferrer">{l.label} ↗</a>
              </li>
            ))}
          </ul>
        </section>
      </main>

      <footer>© {new Date().getFullYear()} {profile.name}</footer>
    </>
  )
}
