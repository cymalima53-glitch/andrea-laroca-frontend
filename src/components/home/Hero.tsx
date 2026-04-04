import Link from 'next/link';
import Image from 'next/image';
import styles from './Hero.module.css';
import type { Locale } from '../../i18n-config';
import { getDictionary } from '@/lib/get-dictionary';


export default async function Hero({
    lang,
    imageSrc,
    title,
    subtitle,
    eyebrow,
    tagline,
    videoSrc
}: {
    lang: Locale,
    imageSrc?: string,
    title?: string,
    subtitle?: string,
    eyebrow?: string,
    tagline?: string,
    videoSrc?: string
}) {
    const dict = await getDictionary(lang);
    console.log(`[Hero Debug] lang=${lang} videoSrc=${videoSrc ? 'PRESENT' : 'MISSING'} title=${title}`);

    return (
        <section className={styles.hero}>
            <div className={styles.videoOverlay}></div>
            <div className={styles.videoPlaceholder}>
                {videoSrc ? (
                    <video
                        key={videoSrc}
                        className={styles.heroVideo}
                        src={videoSrc}
                        autoPlay
                        loop
                        muted
                        playsInline
                    />
                ) : (
                    <Image
                        src={imageSrc || "/building.png"}
                        alt="Hero Image"
                        fill
                        className={styles.heroImage}
                        priority
                        quality={90}
                        style={{ objectFit: 'cover' }}
                    />
                )}
            </div>

            <div className={styles.content}>
                {eyebrow !== "" && <span className={styles.eyebrow}>{eyebrow || dict.common.hero.eyebrow}</span>}
                <h1 className={styles.title}>{title || dict.common.hero.title}</h1>
                {tagline && <span className={styles.tagline}>{tagline}</span>}
                <p className={styles.subtitle} style={{ whiteSpace: 'pre-line' }}>{subtitle || dict.common.hero.subtitle}</p>


            </div>
        </section>
    );
}
