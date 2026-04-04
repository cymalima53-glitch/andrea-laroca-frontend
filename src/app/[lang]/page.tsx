import { getDictionary } from '../../lib/get-dictionary';
import { Locale } from "../../i18n-config";

export const dynamic = 'force-dynamic';
import Hero from "../../components/home/Hero";
import HeritageSection from "../../components/home/HeritageSection";
import ProductShowcase from "../../components/products/ProductShowcase";
import WhyUs from "../../components/home/WhyUs";
import Testimonials from "../../components/home/Testimonials";
import FAQ from "../../components/home/FAQ";
import InquireForm from "../../components/contact/InquireForm";
import { Product } from "../../app/types";

// Helper function to map categories (same as in products page)
function mapCategory(backendCategory: string): Product['category'] {
    const lower = backendCategory.toLowerCase();
    if (lower.includes('coffee')) return 'coffee';
    if (lower.includes('machine')) return 'machines';
    if (lower.includes('access')) return 'accessories';
    return 'italian';
}

async function getProducts(): Promise<Product[]> {
    try {
        const res = await fetch((process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000') + '/api/products', { cache: 'no-store' }); // Ensure fresh data
        if (!res.ok) throw new Error('Failed to fetch products');
        const data = await res.json();
        return data.map((item: any) => ({
            id: item.id.toString(),
            name: item.name,
            price: item.price,
            description: item.description || '',
            image: item.image_url || '/placeholder.jpg',
            category: mapCategory(item.category)
        }));
    } catch (error) {
        console.error('Error fetching products:', error);
        return [];
    }
}

export default async function Home({ params }: { params: Promise<{ lang: Locale }> }) {
    const { lang } = await params;
    const dict = await getDictionary(lang);
    const products = await getProducts();

    return (
        <main>
            <Hero
                lang={lang}
                imageSrc="/images/itallianfood.png"
                tagline="Fine Foods and Beverage"
            />
            <HeritageSection lang={lang} />

            <WhyUs lang={lang} />
            <Testimonials lang={lang} />
            <FAQ title={dict.common.faq.title} items={dict.common.faq.items} />
            <InquireForm dict={dict} />
        </main>
    );
}
