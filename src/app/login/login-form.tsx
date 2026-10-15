"use client";

import { useState, type FormEvent } from "react";
import Image from "next/image";
import { GarroBrand } from "@/components/garro-brand";
import Link from "next/link";
import {
  ArrowRight, Eye, EyeOff, Headphones, LockKeyhole,
  Monitor, UserRound,
} from "lucide-react";
import styles from "./login.module.css";

type Role = "GESTOR_GARRO" | "ATENDENTE" | "EDITOR";

const profiles = [
  { role: "GESTOR_GARRO", label: "Gestor", Icon: UserRound },
  { role: "ATENDENTE", label: "Atendente", Icon: Headphones },
  { role: "EDITOR", label: "Editor", Icon: Monitor },
] as const;

export default function LoginForm() {
  const [role, setRole] = useState<Role>("GESTOR_GARRO");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [visible, setVisible] = useState(false);
  const [remember, setRemember] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) return;

    setError("");
    setLoading(true);
    try {
      const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
      const response = await fetch(`${basePath}/api/auth/login`, {
        method: "POST", credentials: "same-origin", cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ login: identifier, password, selectedRole: role, rememberMe: remember }),
      });
      const result = await response.json();
      if (!response.ok || result.error) { setError(result.error || "Não foi possível entrar. Tente novamente."); return; }
      if (result.redirectTo !== `${basePath}/painel`) throw new Error("Resposta de acesso inválida.");
      window.location.assign(result.redirectTo);
    } catch {
      setError("Não foi possível acessar o servidor. Confira sua conexão e tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <section className={styles.photoSide} aria-label="Garro Produtora — produzindo histórias reais">
          <Image
            src="/images/garro-cinema-login.png"
            alt="Câmera profissional em estúdio com luz dourada e os dizeres produzindo histórias reais"
            fill
            sizes="51vw"
            quality={95}
            priority
            className={styles.photo}
          />
        </section>

        <section className={styles.formSide} aria-label="Acesso ao sistema Garro">
          <div className={styles.formContent}>
            <GarroBrand size={60} wordmarkWidth={168} className={styles.brand} priority />
            <div className={styles.shortRule} aria-hidden="true" />
            <header className={styles.header}>
              <h1>Bem-vindo de volta</h1>
              <p>Acesse o sistema para continuar.</p>
            </header>

            <form onSubmit={handleSubmit} className={styles.form}>
              <fieldset className={styles.roleGroup}>
                <legend>Tipo de acesso</legend>
                <div className={styles.roleGrid}>
                  {profiles.map(({ role: itemRole, label, Icon }) => (
                    <button
                      key={itemRole}
                      className={`${styles.roleCard} ${role === itemRole ? styles.roleActive : ""}`}
                      type="button"
                      aria-pressed={role === itemRole}
                      onClick={() => { setRole(itemRole); setError(""); }}
                    >
                      <span className={styles.selection} aria-hidden="true" />
                      <Icon className={styles.roleIcon} strokeWidth={1.7} aria-hidden="true" />
                      <span>{label}</span>
                    </button>
                  ))}
                </div>
              </fieldset>

              <div className={styles.field}>
                <label htmlFor="login-identifier">Usuário</label>
                <div className={styles.inputFrame}>
                  <UserRound aria-hidden="true" size={19} strokeWidth={1.65} />
                  <input
                    id="login-identifier"
                    type="text"
                    autoComplete="username"
                    autoCapitalize="none"
                    spellCheck={false}
                    placeholder="Digite seu usuário"
                    required
                    maxLength={254}
                    value={identifier}
                    onChange={(event) => setIdentifier(event.target.value)}
                  />
                </div>
              </div>

              <div className={styles.field}>
                <label htmlFor="login-password">Senha</label>
                <div className={styles.inputFrame}>
                  <LockKeyhole aria-hidden="true" size={19} strokeWidth={1.65} />
                  <input
                    id="login-password"
                    type={visible ? "text" : "password"}
                    autoComplete="current-password"
                    placeholder="Digite sua senha"
                    required
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                  />
                  <button
                    type="button"
                    className={styles.eyeButton}
                    onClick={() => setVisible(!visible)}
                    aria-label={visible ? "Ocultar senha" : "Mostrar senha"}
                  >
                    {visible ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>

              <div className={styles.options}>
                <label className={styles.remember}>
                  <input
                    type="checkbox"
                    checked={remember}
                    onChange={(event) => setRemember(event.target.checked)}
                  />
                  <span>Lembrar de mim</span>
                </label>
                <Link href="/recuperar-senha">Esqueceu sua senha?</Link>
              </div>

              {error ? <p role="alert" className={styles.error}>{error}</p> : null}
              <button className={styles.submit} type="submit" disabled={loading}>
                <span>{loading ? "Entrando..." : "Entrar"}</span>
                {!loading && <ArrowRight size={21} strokeWidth={1.8} aria-hidden="true" />}
              </button>
            </form>

            <div className={styles.footer}>
              <span aria-hidden="true" />
              <p>CONTEÚDO QUE APROXIMA PESSOAS</p>
              <span aria-hidden="true" />
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
