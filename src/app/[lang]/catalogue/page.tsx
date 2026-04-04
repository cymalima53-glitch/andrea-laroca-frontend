import { Locale } from "../../../i18n-config";
import Hero from "../../../components/home/Hero";
import { getDictionary } from "../../../lib/get-dictionary";
import CatalogueBrowser from "./CatalogueBrowser";
import { Product } from "../../../app/types";

// Force dynamic rendering since we are fetching data
export const dynamic = 'force-dynamic';

function mapCategory(backendCategory: string): Product['category'] {
    return backendCategory; // Direct mapping since we relaxed the type
}

async function getCatalogueItems(): Promise<Product[]> {
    try {
        const res = await fetch((process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000') + '/api/catalogue', { cache: 'no-store' });

        if (!res.ok) {
            throw new Error('Failed to fetch catalogue items');
        }

        const data = await res.json();

        return data.map((item: any) => ({
            id: item.id.toString(),
            name: item.name,
            price: item.price,
            description: item.description || '',
            image: item.image_url || '/placeholder.jpg',
            image_url: item.image_url || '/placeholder.jpg',
            nutrition_image_url: item.nutrition_image_url || null,
            variants: item.variants || [],
            category: mapCategory(item.category)
        }));
    } catch (error) {
        console.error('Error fetching catalogue items:', error);
        return [];
    }
}

export default async function CataloguePage({
    params,
    searchParams
}: {
    params: Promise<{ lang: Locale }>,
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
    const { lang } = await params;
    const dict = await getDictionary(lang);

    const products = await getCatalogueItems();

    const commonAny = dict.common as any;
    const heroTitle = commonAny.cataloguePage?.title || "Wholesale Catalogue";
    const heroSubtitle = commonAny.cataloguePage?.subtitle || "Browse our premium selection.";
    const heroEyebrow = commonAny.cataloguePage?.eyebrow || "WHOLESALE";

    return (
        <main>
            <Hero
                lang={lang}
                imageSrc="/images/product%20italian.png"
                title={heroTitle}
                subtitle={heroSubtitle}
                eyebrow=""
            />

            <div className="py-12">
                <CatalogueBrowser products={products} />
            </div>

            <section style={{ padding: '0 0 4rem', textAlign: 'center' }}>
                <div className="container">
                    <p style={{ maxWidth: '600px', margin: '0 auto', fontSize: '0.9rem', color: '#666' }}>
                        * Prices available upon approved wholesale account. Click &quot;Request Order&quot; on any product to apply.
                    </p>
                </div>
            </section>
        </main>
    );
}

