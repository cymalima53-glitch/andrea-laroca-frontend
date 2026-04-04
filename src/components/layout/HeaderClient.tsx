'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import LanguageSwitcher from './LanguageSwitcher';
import HeaderActions from './HeaderActions';
import styles from './Header.module.css';

export default function HeaderClient({ lang, dict }: { lang: string; dict: any }) {
    const [menuOpen, setMenuOpen] = useState(false);

    return (
        <>
            <header className={styles.header}>
                <div className={`container ${styles.headerInner}`}>
                    <Link href={`/${lang}`} className={styles.logo} onClick={() => setMenuOpen(false)}>
                        <div className={styles.logoImageWrapper}>
                            <Image
                                src="/images/logo.png"
                                alt="La Rocca Logo"
                                width={56}
                                height={75}
                                className={styles.logoImage}
                                priority
                                unoptimized
                            />
                        </div>
                        <div className={styles.logoTextWrapper}>
                            <span className={styles.logoText}>LA ROCCA</span>
                            <span className={styles.tagline}>fine foods &amp; beverage</span>
                        </div>
                    </Link>

                    {/* Desktop Nav */}
                    <nav className={styles.navMenu}>
                        <Link href={`/${lang}`} className={styles.navLink}>{dict.common.nav.home}</Link>
                        <Link href={`/${lang}/about`} className={styles.navLink}>{dict.common.nav.about}</Link>
                        <Link href={`/${lang}/coffee`} className={styles.navLink}>{dict.common.nav.coffee}</Link>
                        <Link href={`/${lang}/catalogue`} className={styles.navLink}>{dict.common.nav.catalogue}</Link>
                        <Link href={`/${lang}/products`} className={styles.navLink}>{dict.common.nav.products}</Link>
                    </nav>

                    <div className={styles.headerRight}>
                        <div className={styles.headerActions}>
                            <HeaderActions />
                        </div>

                        {/* Hamburger Button */}
                        <button
                            className={styles.hamburger}
                            onClick={() => setMenuOpen(!menuOpen)}
                            aria-label="Toggle menu"
                        >
                            <span className={menuOpen ? styles.barOpen1 : ''}></span>
                            <span className={menuOpen ? styles.barOpen2 : ''}></span>
                            <span className={menuOpen ? styles.barOpen3 : ''}></span>
                        </button>
                    </div>
                </div>
            </header>

            {/* Mobile Drawer */}
            <div className={`${styles.mobileMenu} ${menuOpen ? styles.open : ''}`}>
                <Link href={`/${lang}`} className={styles.mobileNavLink} onClick={() => setMenuOpen(false)}>{dict.common.nav.home}</Link>
                <Link href={`/${lang}/about`} className={styles.mobileNavLink} onClick={() => setMenuOpen(false)}>{dict.common.nav.about}</Link>
                <Link href={`/${lang}/coffee`} className={styles.mobileNavLink} onClick={() => setMenuOpen(false)}>{dict.common.nav.coffee}</Link>
                <Link href={`/${lang}/catalogue`} className={styles.mobileNavLink} onClick={() => setMenuOpen(false)}>{dict.common.nav.catalogue}</Link>
                <Link href={`/${lang}/products`} className={styles.mobileNavLink} onClick={() => setMenuOpen(false)}>{dict.common.nav.products}</Link>
                
                {/* Mobile Auth Links */}
                <div className="mt-4 border-t border-[#d4af37]/20 pt-4">
                    <Link href="/auth/login" className={styles.mobileNavLink} style={{color: '#d4af37'}} onClick={() => setMenuOpen(false)}>Login</Link>
                    <Link href="/auth/login?tab=register" className={styles.mobileNavLink} style={{color: '#d4af37'}} onClick={() => setMenuOpen(false)}>Join</Link>
                </div>
            </div>
        </>
    );
}
