import { Locale } from "../../../i18n-config";
import Hero from "../../../components/home/Hero";
import ProductShowcase from "../../../components/products/ProductShowcase";
import { getDictionary } from "../../../lib/get-dictionary";
import styles from './coffee.module.css';
import LazyVideo from "../../../components/common/LazyVideo";

export default async function CoffeePage({ params }: { params: Promise<{ lang: Locale }> }) {
    const { lang } = await params;
    const dict = await getDictionary(lang);

    return (
        <main>
            <Hero
                lang={lang}
                title="COFFEE"
                tagline="Heritage & Tradition"
                subtitle="Our coffee runs deep in the roots of Italian heritage and our traditional methods that have been passed down through the years allow us to deliver the best artisan coffee to the consumer today.

We are proud distributors of one of the most antique Neapolitan coffee brands, which is Passalacqua."
                imageSrc="https://res.cloudinary.com/dfhzjoujm/image/upload/v1771247437/Gemini_Generated_Image_k6znykk6znykk6zn_jyua7j.png"
                eyebrow="PREMIUM SELECTION"
            />

            <div className={styles.pageContainer}>

                {/* Section 2: Description */}
                <section className={styles.descriptionSection}>
                    <div className={styles.descriptionContainer}>
                        <h2 className={styles.title}>OUR LEGACY</h2>
                        <div className={styles.divider}></div>
                        <p className={styles.text}>
                            <span className={styles.dropCap}>P</span>assalacqua, for which we are the exclusive distributor in South Florida, stands as a symbol of true Neapolitan heritage. Inspired by this legacy, we bring together a collection of rare, niche food and beverage treasures from across Italy — products crafted with passion, patience, and stories worth sharing.
                        </p>
                    </div>
                </section>
                {/* Section 3: Video */}

                <section className={styles.videoSection}>
                    <div className={styles.videoContainer}>
                        <LazyVideo
                            src="https://res.cloudinary.com/dfhzjoujm/video/upload/v1774898340/b4mh13a5bxrmy0cx80pade25fg_result__zbsraa.mp4"
                            className={styles.videoPlayer}
                        />
                    </div>
                </section>

            </div>
        </main>
    );
}
