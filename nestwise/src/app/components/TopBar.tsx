"use client";
import styles from "./TopBar.module.css";
export default function TopBar() {
  return (
    <header className={styles.topbar}>
      <div className={styles.logo}>nest<span>wise</span></div>
      <div className={styles.tagline}>Find smarter. Move better. Stay protected.</div>
    </header>
  );
}
