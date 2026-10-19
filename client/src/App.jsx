import RequestForm from './components/RequestForm.jsx';
import './App.css';

export default function App() {
  return (
    <div className="page">
      <header className="header">
        <img src="/logo.svg" alt="Yazıcı Güvenlik Sistemleri" className="logo" />
      </header>

      <main>
        <section className="hero">
          <h1>Güvenlik Sistemleri Bakım Talepleri</h1>
          <p>
            Kamera, yangın algılama ve geçiş kontrol sistemleriniz için
            bakım ve arıza talebi oluşturun.
          </p>
        </section>

        <section className="form-section">
          <h2>Bakım Talebi Oluştur</h2>
          <RequestForm />
        </section>
      </main>

      <footer className="footer">
        <p>© 2026 Yazıcı Güvenlik Sistemleri</p>
      </footer>
    </div>
  );
}
