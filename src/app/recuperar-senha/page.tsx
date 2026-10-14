import Link from "next/link";

export default function PasswordHelpPage() {
  return (
    <main style={{ minHeight: "100dvh", display: "grid", placeItems: "center", background: "#f5eee6", padding: 24 }}>
      <section style={{ background: "#fffcf8", padding: 36, borderRadius: 14, border: "1px solid #e7d7ca", maxWidth: 490 }}>
        <h1 style={{ fontSize: 25, fontWeight: 500, color: "#321d17", marginTop: 0 }}>Recuperar acesso</h1>
        <p style={{ color: "#705a4e", lineHeight: 1.6 }}>Nesta etapa, a redefinição de senha é feita pela gestora do sistema. Solicite a ela uma nova senha de acesso.</p>
        <Link href="/login" style={{ color: "#a75132" }}>Voltar ao login</Link>
      </section>
    </main>
  );
}
