import Hero from '../../../components/home/Hero';
import ProductShowcase from '../../../components/products/ProductShowcase';
import type { Product } from '../../types';
import { getDictionary } from '@/lib/get-dictionary';
import type { Locale } from '../../../i18n-config';

export const dynamic = 'force-dynamic';

// Mock Dictionary for client component (or fetch it)
// Since this is a client component, we might need to pass dict from server page, 
// but for now we'll hardcode or fetch. 
// Actually, the previous page.tsx was likely a Server Component that passed data to Client Components.
// But we are in 'use client'.
// Let's use standard texts for now or minimal auth/dict dependency.
// User wants "hero coffe tab". 

// Server Component
export default async function RetailProductsPage({ params }: { params: Promise<{ lang: Locale }> }) {
    const { lang } = await params;
    // Fetch products server-side
    let products: Product[] = [];
    try {
        const res = await fetch((process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000') + '/api/retail/products', {
            cache: 'no-store'
        });
        if (res.ok) {
            const data = await res.json();
            // Map backend fields to frontend interface without normalization
            // ProductGrid will handle dynamic tabs based on these categories
            products = data.map((item: any) => ({
                id: item.id,
                name: item.name,
                description: item.description,
                price: item.price,
                category: item.category || 'Other', // Use raw category
                image: item.image_url || item.image || '/coffee-bag-placeholder.png', // Fallback
                image_url: item.image_url || item.image || '/coffee-bag-placeholder.png',
                nutrition_image_url: item.nutrition_image_url || null,
                variants: item.variants || [],
            }));
        }
    } catch (error) {
        console.error('Failed to fetch products:', error);
    }

    const categories = {
        all: 'ALL',
        coffee: 'COFFEE',
        machines: 'MACHINES',
        accessories: 'ACCESSORIES',
        italian: 'ITALIAN',
    };

    return (
        <main>
            <Hero
                lang={lang || 'en'}
                title="OUR PRODUCTS"
                subtitle="Explore our premium selection of Italian coffee and fine foods."
                imageSrc="/images/itallianfood.png"
                eyebrow="Retail Shop"
            />

            {/* Guest Checkout Banner */}
            <div style={{ maxWidth: '1200px', margin: '3rem auto -1rem auto', padding: '0 1.5rem' }}>
                <div style={{
                    background: 'linear-gradient(135deg, #1a0a00 0%, #2c1810 100%)',
                    border: '1px solid rgba(212, 175, 55, 0.4)',
                    borderRadius: '8px',
                    padding: '20px 24px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '20px',
                    flexWrap: 'wrap',
                    textAlign: 'center',
                    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)'
                }}>
                    <span style={{ fontSize: '28px' }}>🛍️</span>
                    <div style={{ flex: '1 1 auto', minWidth: '250px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <p style={{ 
                            color: '#d4af37', 
                            fontWeight: 700, 
                            margin: '0 0 4px 0', 
                            fontFamily: 'serif', 
                            fontSize: 'clamp(1rem, 4vw, 1.25rem)',
                            letterSpacing: '0.5px'
                        }}>
                            Browse and order as a guest. No account required for retail purchases.
                        </p>
                        <p style={{ color: '#EAE0D5', margin: 0, fontSize: '0.9rem', opacity: 0.9 }}>
                            Wholesale distributors: Create an account to access bulk pricing and exclusive offers.
                        </p>
                    </div>
                </div>
            </div>

            <ProductShowcase
                products={products}
                categories={categories}
                title="Curated Selection"
                initialCategory="ALL ITEMS"
            />
        </main>
    );
}
