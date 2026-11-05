import Link from "next/link";
import s from "./landing.module.css";

export const metadata = { title: "Page not found" };

export default function NotFound() {
  return (
    <div className={`${s.page} landing`}>
      <div className={s.wrap}>
        <nav className={s.nav}>
          <Link href="/" className={s.brand}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/icon.png" alt="" width={32} height={32} />
            <span>
              VoiceBill<em>Pro</em>
            </span>
          </Link>
        </nav>
        <header className={s.hero}>
          <p className={s.eyebrow}>404</p>
          <h1>This page doesn&apos;t exist.</h1>
          <p className={s.lead}>Check the address for a typo, or head back home.</p>
          <div className={s.heroBtns}>
            <Link className={s.btn} href="/">Go home</Link>
            <Link className={s.btnGhost} href="/invoices">My invoices</Link>
          </div>
        </header>
      </div>
    </div>
  );
}
