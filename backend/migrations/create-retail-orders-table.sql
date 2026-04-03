-- Create retail_orders table
CREATE TABLE IF NOT EXISTS retail_orders (
    id SERIAL PRIMARY KEY,
    order_id VARCHAR(20) UNIQUE NOT NULL,
    customer_name VARCHAR(255) NOT NULL,
    customer_email VARCHAR(255) NOT NULL,
    customer_phone VARCHAR(50),
    shipping_address TEXT NOT NULL,
    shipping_city VARCHAR(100),
    shipping_state VARCHAR(50),
    shipping_zip VARCHAR(20),
    items JSONB NOT NULL,
    total DECIMAL(10, 2) NOT NULL,
    status VARCHAR(50) DEFAULT 'Processing',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index on order_id for faster lookups
CREATE INDEX idx_retail_orders_order_id ON retail_orders(order_id);

-- Create index on status for filtering
CREATE INDEX idx_retail_orders_status ON retail_orders(status);

-- Create trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION update_retail_orders_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_retail_orders_updated_at
BEFORE UPDATE ON retail_orders
FOR EACH ROW
EXECUTE FUNCTION update_retail_orders_updated_at();
