'use client';

import { useState } from 'react';
import Image from 'next/image';
import styles from './ProductCard.module.css';
import { usePathname } from 'next/navigation';
import ProductVariantModal from './ProductVariantModal';
import type { VariantProduct } from './ProductVariantModal';

interface Product {
    id: string;
    name: string;
    price: string | number;
    description: string;
    image: string;
    image_url?: string;
    nutrition_image_url?: string;
    category?: string;
    variants?: Array<{ size: string; type: string; price: number }>;
}

export default function ProductCard({ product }: { product: Product }) {
    const pathname = usePathname();
    const isCatalogue = pathname?.includes('/catalogue');
    const [modalOpen, setModalOpen] = useState(false);

    const handleClick = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setModalOpen(true);
    };

    const variantProduct: VariantProduct = {
        id: product.id,
        name: product.name,
        description: product.description,
        image: product.image,
        image_url: product.image_url || product.image,
        nutrition_image_url: product.nutrition_image_url,
        category: product.category,
        variants: product.variants,
        price: product.price,
    };

    return (
        <>
            <div className={styles.card} onClick={handleClick} style={{ cursor: 'pointer' }}>
                <div className={styles.imageWrapper}>
                    <Image
                        src={product.image || '/placeholder.jpg'}
                        alt={product.name || 'Product Image'}
                        width={800}
                        height={600}
                        className={styles.image}
                    />
                    <div className={styles.overlay}>
                        <button
                            className={styles.viewBtn}
                            onClick={handleClick}
                        >
                            VIEW OPTIONS
                        </button>
                    </div>
                </div>
                <div className={styles.content}>
                    <h3 className={styles.name}>{product.name}</h3>
                    <p className={styles.price} style={{ fontSize: '13px', color: '#9ca3af', fontStyle: 'italic' }}>
                        {(() => {
                            const uniqueTypes = [...new Set((product.variants || []).map(v => v.type))];
                            return uniqueTypes.length > 1 ? 'Select size & type →' : 'Select size →';
                        })()}
                    </p>
                    <p className={styles.description}>{product.description}</p>
                </div>
            </div>

            <ProductVariantModal
                product={variantProduct}
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                mode={isCatalogue ? 'wholesale' : 'retail'}
            />
        </>
    );
}
