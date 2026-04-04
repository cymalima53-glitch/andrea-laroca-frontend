'use client';

import { useState, useEffect } from 'react';
import { X, ShoppingCart, ShoppingBag, Clock, Lock } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { useNotification } from '../../context/NotificationContext';
import { useAuth } from '../../context/AuthContext';
import { useRouter } from 'next/navigation';

export interface ProductVariant {
    size: string;
    type: string;
    price: number;
}

export interface VariantProduct {
    id: string | number;
    name: string;
    description?: string;
    image?: string;
    image_url?: string;
    nutrition_image_url?: string;
    category?: string;
    variants?: ProductVariant[];
    price?: string | number;
}

interface ProductVariantModalProps {
    product: VariantProduct | null;
    isOpen: boolean;
    onClose: () => void;
    mode: 'retail' | 'wholesale';
}


export default function ProductVariantModal({ product, isOpen, onClose, mode }: ProductVariantModalProps) {
    const { addToRetailCart, addToWholesaleCart } = useCart();
    const { showSuccess } = useNotification();
    const { user } = useAuth();
    const router = useRouter();

    const [selectedSize, setSelectedSize] = useState<string | null>(null);
    const [selectedType, setSelectedType] = useState<string | null>(null);
    const [activeImage, setActiveImage] = useState<'product' | 'nutrition'>('product');
    const [adding, setAdding] = useState(false);

    const isLoggedIn = !!user;
    const isApproved = user?.role === 'wholesale' && user?.approval_status === 'approved';
    const isPending = user?.role === 'wholesale' && user?.approval_status === 'pending';
    const isAdmin = user?.role === 'admin';

    // Must be approved in wholesale mode to add to cart
    const canAddToCart = mode === 'retail' || isApproved || isAdmin;

    // Reset when product changes
    useEffect(() => {
        setSelectedSize(null);
        setSelectedType(null);
        setActiveImage('product');
    }, [product?.id]);

    // Lock body scroll when open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => { document.body.style.overflow = ''; };
    }, [isOpen]);

    if (!isOpen || !product) return null;

    const hasVariants = product.variants && product.variants.length > 0;
    const variants: ProductVariant[] = hasVariants ? product.variants! : [];

    const sizes = Array.from(new Set(variants.map(v => v.size)));
    const types = Array.from(new Set(variants.map(v => v.type)));
    const hasMultipleTypes = types.length > 1;

    // Auto-select the type when there is only one (no user choice needed)
    const effectiveType = hasMultipleTypes ? selectedType : (types[0] ?? null);

    const currentVariant = (selectedSize && effectiveType)
        ? variants.find(v => v.size === selectedSize && v.type === effectiveType)
        : null;

    const productImage = product.image_url || product.image || '/placeholder.jpg';
    const nutritionImage = product.nutrition_image_url || null;
    const displayImage = activeImage === 'nutrition' && nutritionImage ? nutritionImage : productImage;

    // For no-variant products, always considered "ready to add"
    // If only one type exists there is nothing to select — size alone is enough
    const allSelected = hasVariants
        ? (hasMultipleTypes ? !!(selectedSize && selectedType) : !!selectedSize)
        : true;
    const price = currentVariant?.price;

    const handleAddToCart = async () => {
        if (mode === 'wholesale' && !canAddToCart) {
            if (isPending) {
                showSuccess('Your account is pending admin approval. You will be notified by email.');
                return;
            }
            router.push('/auth/login?tab=register&from=catalogue');
            return;
        }

        if (hasVariants && !allSelected) return;
        setAdding(true);

        const cartProduct = {
            id: product.id,
            name: product.name,
            price: hasVariants && currentVariant ? currentVariant.price : (Number(product.price) || 0),
            image: productImage,
            image_url: productImage,
            variantSize: selectedSize ?? undefined,
            variantType: selectedType ?? undefined,
        };

        try {
            if (mode === 'wholesale') {
                await addToWholesaleCart(cartProduct);
            } else {
                addToRetailCart(cartProduct);
            }
            const variantLabel = selectedSize
                ? (hasMultipleTypes && effectiveType
                    ? ` (${selectedSize} · ${effectiveType})`
                    : ` (${selectedSize})`)
                : '';
            showSuccess(`${product.name}${variantLabel} added to ${mode === 'wholesale' ? 'quote' : 'cart'}!`);
            onClose();
        } finally {
            setAdding(false);
        }
    };

    return (
        <>
            {/* Backdrop */}
            <div
                onClick={onClose}
                style={{
                    position: 'fixed', inset: 0,
                    background: 'rgba(0,0,0,0.75)',
                    backdropFilter: 'blur(4px)',
                    zIndex: 9998,
                    animation: 'modalBackdropIn 0.2s ease',
                }}
            />

            {/* Modal */}
            <div
                style={{
                    position: 'fixed',
                    top: '50%', left: '50%',
                    transform: 'translate(-50%, -50%)',
                    zIndex: 9999,
                    width: '90%',
                    maxWidth: '780px',
                    maxHeight: '90vh',
                    overflowY: 'auto',
                    background: 'linear-gradient(135deg, #1a0d00 0%, #2c1810 50%, #1a0d00 100%)',
                    border: '1px solid rgba(212,175,55,0.4)',
                    borderRadius: '16px',
                    boxShadow: '0 32px 80px rgba(0,0,0,0.8), inset 0 1px 0 rgba(212,175,55,0.2)',
                    animation: 'modalIn 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)',
                }}
            >
                {/* Header */}
                <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '20px 24px 16px',
                    borderBottom: '1px solid rgba(212,175,55,0.15)',
                }}>
                    <div>
                        <p style={{ color: '#a08030', fontSize: '11px', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '4px', fontFamily: 'serif' }}>
                            {product.category || 'Product'}
                        </p>
                        <h2 style={{ color: '#d4af37', fontSize: '22px', fontWeight: 700, fontFamily: 'serif', letterSpacing: '1px', margin: 0 }}>
                            {product.name}
                        </h2>
                    </div>
                    <button
                        onClick={onClose}
                        style={{
                            background: 'rgba(212,175,55,0.1)', border: '1px solid rgba(212,175,55,0.3)',
                            borderRadius: '50%', width: '36px', height: '36px',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            cursor: 'pointer', color: '#d4af37', flexShrink: 0,
                            transition: 'background 0.2s',
                        }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(212,175,55,0.2)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'rgba(212,175,55,0.1)')}
                        aria-label="Close modal"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Body */}
                <div style={{ padding: '24px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px' }}>

                    {/* Left: Images */}
                    <div>
                        {/* Main image */}
                        <div style={{
                            borderRadius: '10px', overflow: 'hidden',
                            border: '1px solid rgba(212,175,55,0.2)',
                            background: '#1a0900',
                            aspectRatio: '4/3',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            marginBottom: '12px',
                        }}>
                            {displayImage && displayImage !== '/placeholder.jpg' ? (
                                <img
                                    src={displayImage}
                                    alt={activeImage === 'nutrition' ? 'Nutrition Facts' : product.name}
                                    style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                                />
                            ) : (
                                <ShoppingBag size={48} color="rgba(212,175,55,0.3)" />
                            )}
                        </div>

                        {/* Thumbnail row */}
                        {nutritionImage && (
                            <div style={{ display: 'flex', gap: '10px' }}>
                                {/* Product thumb */}
                                <button
                                    onClick={() => setActiveImage('product')}
                                    style={{
                                        flex: 1,
                                        borderRadius: '8px', overflow: 'hidden',
                                        border: `2px solid ${activeImage === 'product' ? '#d4af37' : 'rgba(212,175,55,0.2)'}`,
                                        background: '#1a0900',
                                        aspectRatio: '1',
                                        cursor: 'pointer', padding: 0,
                                        transition: 'border-color 0.2s',
                                    }}
                                    title="Product Image"
                                >
                                    <img src={productImage} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                </button>
                                {/* Nutrition thumb */}
                                <button
                                    onClick={() => setActiveImage('nutrition')}
                                    style={{
                                        flex: 1,
                                        borderRadius: '8px', overflow: 'hidden',
                                        border: `2px solid ${activeImage === 'nutrition' ? '#d4af37' : 'rgba(212,175,55,0.2)'}`,
                                        background: '#fff',
                                        aspectRatio: '1',
                                        cursor: 'pointer', padding: 0,
                                        transition: 'border-color 0.2s',
                                        position: 'relative',
                                    }}
                                    title="Nutrition Facts"
                                >
                                    <img src={nutritionImage} alt="Nutrition Facts" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    <span style={{
                                        position: 'absolute', bottom: '4px', left: '50%', transform: 'translateX(-50%)',
                                        background: 'rgba(0,0,0,0.7)', color: '#d4af37',
                                        fontSize: '9px', letterSpacing: '1px', padding: '2px 6px', borderRadius: '4px',
                                        whiteSpace: 'nowrap',
                                    }}>NUTRITION</span>
                                </button>
                            </div>
                        )}

                        {product.description && (
                            <p style={{ color: '#a08040', fontSize: '13px', lineHeight: '1.6', marginTop: '14px', fontStyle: 'italic' }}>
                                {product.description}
                            </p>
                        )}
                    </div>

                    {/* Right: Variant Selection or No-Variant CTA */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

                        {hasVariants ? (
                            <>
                                {/* SIZE */}
                                <div>
                                    <p style={{ color: '#d4af37', fontSize: '11px', letterSpacing: '2px', textTransform: 'uppercase', fontWeight: 700, marginBottom: '10px', fontFamily: 'serif' }}>
                                        SIZE
                                    </p>
                                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                                        {sizes.map(size => (
                                            <button
                                                key={size}
                                                onClick={() => setSelectedSize(size)}
                                                style={{
                                                    padding: '8px 20px',
                                                    borderRadius: '6px',
                                                    border: `2px solid ${selectedSize === size ? '#d4af37' : 'rgba(180,180,180,0.3)'}`,
                                                    background: selectedSize === size
                                                        ? 'linear-gradient(135deg, #d4af37 0%, #b08d26 100%)'
                                                        : 'rgba(255,255,255,0.05)',
                                                    color: selectedSize === size ? '#4a1a00' : '#c8c8c8',
                                                    fontWeight: selectedSize === size ? 800 : 500,
                                                    fontSize: '14px',
                                                    cursor: 'pointer',
                                                    transition: 'all 0.18s ease',
                                                    letterSpacing: '0.5px',
                                                    fontFamily: 'serif',
                                                }}
                                                onMouseEnter={e => {
                                                    if (selectedSize !== size) {
                                                        e.currentTarget.style.borderColor = 'rgba(212,175,55,0.5)';
                                                        e.currentTarget.style.background = 'rgba(212,175,55,0.08)';
                                                    }
                                                }}
                                                onMouseLeave={e => {
                                                    if (selectedSize !== size) {
                                                        e.currentTarget.style.borderColor = 'rgba(180,180,180,0.3)';
                                                        e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                                                    }
                                                }}
                                            >
                                                {size}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* TYPE — only shown when product has multiple types */}
                                {hasMultipleTypes && (
                                    <div>
                                        <p style={{ color: '#d4af37', fontSize: '11px', letterSpacing: '2px', textTransform: 'uppercase', fontWeight: 700, marginBottom: '10px', fontFamily: 'serif' }}>
                                            TYPE
                                        </p>
                                        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                                            {types.map(type => (
                                                <button
                                                    key={type}
                                                    onClick={() => setSelectedType(type)}
                                                    style={{
                                                        padding: '8px 20px',
                                                        borderRadius: '6px',
                                                        border: `2px solid ${selectedType === type ? '#d4af37' : 'rgba(180,180,180,0.3)'}`,
                                                        background: selectedType === type
                                                            ? 'linear-gradient(135deg, #d4af37 0%, #b08d26 100%)'
                                                            : 'rgba(255,255,255,0.05)',
                                                        color: selectedType === type ? '#4a1a00' : '#c8c8c8',
                                                        fontWeight: selectedType === type ? 800 : 500,
                                                        fontSize: '14px',
                                                        cursor: 'pointer',
                                                        transition: 'all 0.18s ease',
                                                        letterSpacing: '0.5px',
                                                        fontFamily: 'serif',
                                                    }}
                                                    onMouseEnter={e => {
                                                        if (selectedType !== type) {
                                                            e.currentTarget.style.borderColor = 'rgba(212,175,55,0.5)';
                                                            e.currentTarget.style.background = 'rgba(212,175,55,0.08)';
                                                        }
                                                    }}
                                                    onMouseLeave={e => {
                                                        if (selectedType !== type) {
                                                            e.currentTarget.style.borderColor = 'rgba(180,180,180,0.3)';
                                                            e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                                                        }
                                                    }}
                                                >
                                                    {type}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* PRICE — only show in retail mode */}
                                {mode === 'retail' && (
                                    <div style={{
                                        background: 'rgba(212,175,55,0.07)',
                                        border: '1px solid rgba(212,175,55,0.2)',
                                        borderRadius: '10px',
                                        padding: '16px 20px',
                                    }}>
                                        <p style={{ color: '#a08030', fontSize: '11px', letterSpacing: '2px', textTransform: 'uppercase', margin: '0 0 6px', fontFamily: 'serif' }}>
                                            PRICE
                                        </p>
                                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                                            {price != null ? (
                                                <>
                                                    <span style={{ color: '#d4af37', fontSize: '36px', fontWeight: 800, fontFamily: 'serif', lineHeight: 1 }}>
                                                        ${price.toFixed(2)}
                                                    </span>
                                                    {selectedSize && (
                                                        <span style={{ color: '#a08030', fontSize: '14px', fontStyle: 'italic' }}>
                                                            {hasMultipleTypes && effectiveType
                                                                ? `/ ${selectedSize} · ${effectiveType}`
                                                                : `/ ${selectedSize}`}
                                                        </span>
                                                    )}
                                                </>
                                            ) : (
                                                <span style={{ color: '#a08030', fontSize: '18px', fontStyle: 'italic' }}>
                                                    {!selectedSize
                                                        ? (hasMultipleTypes ? 'Select size & type' : 'Select a size')
                                                        : 'Select a type'}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </>
                        ) : (
                            // No variants — simple product info block
                            <div style={{
                                background: 'rgba(212,175,55,0.05)',
                                border: '1px solid rgba(212,175,55,0.15)',
                                borderRadius: '10px',
                                padding: '20px',
                                textAlign: 'center',
                            }}>
                                <p style={{ color: '#a08040', fontSize: '14px', lineHeight: 1.6, margin: 0, fontStyle: 'italic' }}>
                                    Contact us for pricing and availability on this product.
                                </p>
                            </div>
                        )}

                        {/* ADD TO CART / QUOTE */}
                        <button
                            onClick={handleAddToCart}
                            disabled={canAddToCart ? (hasVariants ? (!allSelected || adding) : adding) : false}
                            style={{
                                width: '100%',
                                padding: '14px 24px',
                                borderRadius: '8px',
                                border: (mode === 'wholesale' && isPending) ? '1px solid #6b9a3a' : 'none',
                                background: canAddToCart
                                    ? (allSelected
                                        ? 'linear-gradient(135deg, #d4af37 0%, #b08d26 100%)'
                                        : 'rgba(255,255,255,0.06)')
                                    : (isPending ? 'rgba(255,255,255,0.06)' : 'linear-gradient(135deg, #d4af37 0%, #b08d26 100%)'),
                                color: canAddToCart 
                                    ? (allSelected ? '#2c1810' : '#666')
                                    : (isPending ? '#8bc34a' : '#2c1810'),
                                fontWeight: 800,
                                fontSize: '14px',
                                letterSpacing: '2px',
                                textTransform: 'uppercase',
                                cursor: canAddToCart 
                                    ? (allSelected ? 'pointer' : 'not-allowed')
                                    : (isPending ? 'default' : 'pointer'),
                                transition: 'all 0.2s ease',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '10px',
                                fontFamily: 'serif',
                                boxShadow: (canAddToCart && allSelected) || (!canAddToCart && !isPending) ? '0 4px 20px rgba(212,175,55,0.3)' : 'none',
                            }}
                            onMouseEnter={e => {
                                if ((canAddToCart && allSelected) || (!canAddToCart && !isPending)) {
                                    e.currentTarget.style.transform = 'translateY(-1px)';
                                    e.currentTarget.style.boxShadow = '0 6px 24px rgba(212,175,55,0.4)';
                                }
                            }}
                            onMouseLeave={e => {
                                e.currentTarget.style.transform = '';
                                e.currentTarget.style.boxShadow = (canAddToCart && allSelected) || (!canAddToCart && !isPending) ? '0 4px 20px rgba(212,175,55,0.3)' : 'none';
                            }}
                        >
                            {adding ? (
                                '...'
                            ) : !canAddToCart && mode === 'wholesale' ? (
                                isPending ? (
                                    <>
                                        <Clock size={16} />
                                        PENDING APPROVAL
                                    </>
                                ) : (
                                    <>
                                        <Lock size={16} />
                                        REQUEST ORDER
                                    </>
                                )
                            ) : (
                                <>
                                    {mode === 'wholesale' ? <ShoppingBag size={18} /> : <ShoppingCart size={18} />}
                                    {hasVariants
                                        ? (allSelected
                                            ? (mode === 'wholesale' ? 'ADD TO QUOTE' : 'ADD TO CART')
                                            : 'SELECT OPTIONS ABOVE')
                                        : (mode === 'wholesale' ? 'ADD TO QUOTE' : 'ADD TO CART')
                                    }
                                </>
                            )}
                        </button>

                        {hasVariants && !allSelected && (
                            <p style={{ color: '#6b5020', fontSize: '12px', textAlign: 'center', margin: '-16px 0 0', fontStyle: 'italic' }}>
                                {hasMultipleTypes
                                    ? '↑ Please select both Size and Type to continue'
                                    : '↑ Please select a Size to continue'}
                            </p>
                        )}
                    </div>
                </div>
            </div>

            <style>{`
                @keyframes modalIn {
                    from { opacity: 0; transform: translate(-50%, -50%) scale(0.92); }
                    to   { opacity: 1; transform: translate(-50%, -50%) scale(1); }
                }
                @keyframes modalBackdropIn {
                    from { opacity: 0; }
                    to   { opacity: 1; }
                }
                @media (max-width: 640px) {
                    .variant-modal-body { grid-template-columns: 1fr !important; }
                }
            `}</style>
        </>
    );
}
