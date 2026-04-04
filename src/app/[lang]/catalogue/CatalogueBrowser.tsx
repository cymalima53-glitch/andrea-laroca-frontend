'use client';

import { useState } from 'react';
import { ShoppingBag, Lock, Clock, CheckCircle } from 'lucide-react';
import styles from './catalogue.module.css';
import { useNotification } from '../../../context/NotificationContext';
import { useAuth } from '../../../context/AuthContext';
import { useRouter } from 'next/navigation';
import ProductVariantModal from '../../../components/products/ProductVariantModal';
import type { VariantProduct } from '../../../components/products/ProductVariantModal';

interface Product {
    id: string;
    name: string;
    description: string;
    price: number | string;
    category: string;
    image: string;
    image_url?: string;
    nutrition_image_url?: string;
    variants?: Array<{ size: string; type: string; price: number }>;
}

interface CatalogueBrowserProps {
    products: Product[];
}

export default function CatalogueBrowser({ products }: CatalogueBrowserProps) {
    const [activeTab, setActiveTab] = useState('ALL ITEMS');
    const [modalProduct, setModalProduct] = useState<VariantProduct | null>(null);
    const { showSuccess } = useNotification();
    const { user, loading } = useAuth();
    const router = useRouter();

    const isLoggedIn = !!user;
    const isApproved = user?.role === 'wholesale' && user?.approval_status === 'approved';
    const isPending = user?.role === 'wholesale' && user?.approval_status === 'pending';
    const isAdmin = user?.role === 'admin';

    const handleProductClick = (product: Product) => {
        // ALWAYS open the modal so users can see product details
        setModalProduct(product);
    };

    const handleButtonClick = (e: React.MouseEvent, product: Product) => {
        e.stopPropagation(); // Don't trigger the card click (which opens modal)
        
        if (isAdmin || isApproved) {
            setModalProduct(product);
            return;
        }
        if (isPending) {
            showSuccess('Your account is pending admin approval. You will be notified by email.');
            return;
        }
        router.push('/auth/login?tab=register&from=catalogue');
    };

    // Button label/icon based on auth state
    const getButtonContent = () => {
        if (isAdmin || isApproved) {
            return { icon: <ShoppingBag size={16} />, label: 'SELECT OPTIONS', style: {} };
        }
        if (isPending) {
            return { icon: <Clock size={16} />, label: 'PENDING APPROVAL', style: { opacity: 0.75, cursor: 'default' } };
        }
        return { icon: <Lock size={16} />, label: 'REQUEST ORDER', style: {} };
    };

    const normalizedProducts = products.map(p => ({
        ...p,
        category: p.category ? p.category.toUpperCase() : 'OTHER'
    }));

    const uniqueCategories = Array.from(new Set(normalizedProducts.map(p => p.category))).sort();
    const categoriesList = ['ALL ITEMS', ...uniqueCategories];

    const filteredProducts = activeTab === 'ALL ITEMS'
        ? normalizedProducts
        : normalizedProducts.filter(p => p.category === activeTab);

    const { icon, label, style: btnStyle } = getButtonContent();

    return (
        <div className="w-full relative">

            {/* ── Info banner based on auth state ── */}
            {!loading && (
                <>
                    {!isLoggedIn && (
                        <div style={{
                            background: 'linear-gradient(135deg, #1a0a00 0%, #2c1810 100%)',
                            border: '1px solid #d4af37',
                            borderRadius: '8px',
                            padding: '16px 24px',
                            marginBottom: '32px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '16px',
                            flexWrap: 'wrap',
                        }}>
                            <Lock size={20} color="#d4af37" style={{ flexShrink: 0 }} />
                            <div style={{ flex: 1 }}>
                                <p style={{ color: '#d4af37', fontWeight: 700, margin: 0, fontFamily: 'serif', fontSize: '15px' }}>
                                    Apply for a Wholesale Account to Place Orders
                                </p>
                                <p style={{ color: '#a08040', margin: '4px 0 0', fontSize: '13px' }}>
                                    Browse our full catalogue freely. Click any &quot;Request Order&quot; button to apply — it only takes a minute.
                                </p>
                            </div>
                            <button
                                onClick={() => router.push('/auth/login?tab=register&from=catalogue')}
                                style={{
                                    background: '#d4af37',
                                    color: '#1a0a00',
                                    border: 'none',
                                    borderRadius: '4px',
                                    padding: '10px 20px',
                                    fontWeight: 700,
                                    fontFamily: 'serif',
                                    cursor: 'pointer',
                                    fontSize: '13px',
                                    textTransform: 'uppercase',
                                    letterSpacing: '1px',
                                    flexShrink: 0,
                                }}
                            >
                                Apply Now
                            </button>
                        </div>
                    )}

                    {isPending && (
                        <div style={{
                            background: 'linear-gradient(135deg, #0a1a00 0%, #1a3010 100%)',
                            border: '1px solid #6b9a3a',
                            borderRadius: '8px',
                            padding: '16px 24px',
                            marginBottom: '32px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '16px',
                        }}>
                            <Clock size={20} color="#6b9a3a" style={{ flexShrink: 0 }} />
                            <div>
                                <p style={{ color: '#8bc34a', fontWeight: 700, margin: 0, fontFamily: 'serif', fontSize: '15px' }}>
                                    Your Application is Under Review
                                </p>
                                <p style={{ color: '#5a8030', margin: '4px 0 0', fontSize: '13px' }}>
                                    Welcome back, {user?.username}! Our team will review your account and notify you by email once approved.
                                </p>
                            </div>
                        </div>
                    )}

                    {isApproved && (
                        <div style={{
                            background: 'linear-gradient(135deg, #0a1a00 0%, #102810 100%)',
                            border: '1px solid #d4af37',
                            borderRadius: '8px',
                            padding: '14px 24px',
                            marginBottom: '32px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                        }}>
                            <CheckCircle size={20} color="#d4af37" style={{ flexShrink: 0 }} />
                            <p style={{ color: '#d4af37', fontWeight: 600, margin: 0, fontFamily: 'serif', fontSize: '14px' }}>
                                Approved Wholesale Account — Welcome, {user?.company_name || user?.username}! Click any product to select options and add to quote.
                            </p>
                        </div>
                    )}
                </>
            )}

            {/* ── Header & Tabs ── */}
            <div className="relative z-10 mb-8 mt-4 text-center">
                <h1 className="text-4xl text-[#d4af37] font-bold mb-8 tracking-widest font-serif block">
                    CATALOGUE
                </h1>
                <div className="h-px w-32 bg-[#d4af37] mx-auto mb-12"></div>

                <div className={styles.tabsContainer}>
                    {categoriesList.map(category => (
                        <button
                            key={category}
                            onClick={() => setActiveTab(category)}
                            className={`${styles.tabButton} ${activeTab === category ? styles.activeTab : ''}`}
                        >
                            {category}
                        </button>
                    ))}
                </div>
            </div>

            {/* ── Product Grid ── */}
            <div className={styles.productsGrid}>
                {filteredProducts.length > 0 ? (
                    filteredProducts.map(product => (
                        <div
                            key={product.id}
                            className={styles.productCard}
                            onClick={() => handleProductClick(product)}
                            style={{ cursor: 'pointer' }}
                        >
                            <div className={styles.imageContainer}>
                                {product.image && product.image !== '/placeholder.jpg' ? (
                                    <img
                                        src={product.image}
                                        alt={product.name}
                                        className={styles.productImage}
                                        onError={(e) => {
                                            (e.target as HTMLImageElement).style.display = 'none';
                                        }}
                                    />
                                ) : (
                                    <span className="text-gray-300"><ShoppingBag size={48} /></span>
                                )}
                                {/* Hover overlay */}
                                {(isApproved || isAdmin) && (
                                    <div style={{
                                        position: 'absolute', inset: 0,
                                        background: 'rgba(0,0,0,0.5)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        opacity: 0,
                                        transition: 'opacity 0.2s',
                                        borderRadius: '4px',
                                    }}
                                        className={styles.imageOverlay}
                                    >
                                        <span style={{ color: '#d4af37', fontSize: '13px', fontWeight: 700, letterSpacing: '1px', fontFamily: 'serif' }}>
                                            VIEW OPTIONS
                                        </span>
                                    </div>
                                )}
                            </div>

                            <div className={styles.cardContent}>
                                <h3 className={styles.productName}>{product.name}</h3>
                                <p className={styles.productDesc}>
                                    {product.description || 'Premium quality product.'}
                                </p>

                                <button
                                    id={`btn-${product.id}`}
                                    onClick={e => handleButtonClick(e, product)}
                                    className={styles.buyButton}
                                    style={btnStyle}
                                >
                                    {icon}
                                    {label}
                                </button>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="col-span-3 text-center text-gray-500 py-12 text-xl font-serif">
                        No products found in this category.
                    </div>
                )}
            </div>

            {/* ── Variant Modal ── */}
            <ProductVariantModal
                product={modalProduct}
                isOpen={!!modalProduct}
                onClose={() => setModalProduct(null)}
                mode="wholesale"
            />
        </div>
    );
}
