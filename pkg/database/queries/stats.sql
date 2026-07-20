-- name: GetFranchiseSalesSummary :one
SELECT 
    COALESCE(COUNT(v.uuid), 0)::bigint AS total_sales,
    COALESCE(SUM(p.price), 0.0)::float AS total_revenue
FROM ventes v
JOIN produits p ON v.produit_uuid = p.uuid
WHERE v.franchise_uuid = $1;

-- name: GetFranchiseSellersCount :one
SELECT COUNT(*)::bigint FROM vendeurs 
WHERE franchise_uuid = $1;

-- name: GetFranchiseTopProducts :many
SELECT 
    p.uuid,
    p.name,
    p.price,
    COUNT(v.uuid)::bigint AS sales_count,
    COALESCE(SUM(p.price), 0.0)::float AS revenue
FROM ventes v
JOIN produits p ON v.produit_uuid = p.uuid
WHERE v.franchise_uuid = $1
GROUP BY p.uuid, p.name, p.price
ORDER BY sales_count DESC, revenue DESC
LIMIT $2;

-- name: GetFranchiseTopSellers :many
SELECT 
    u.uuid,
    u.email,
    COUNT(v.uuid)::bigint AS sales_count,
    COALESCE(SUM(p.price), 0.0)::float AS revenue
FROM ventes v
JOIN vendeurs vend ON v.vendeur_uuid = vend.user_uuid
JOIN users u ON vend.user_uuid = u.uuid
JOIN produits p ON v.produit_uuid = p.uuid
WHERE v.franchise_uuid = $1
GROUP BY u.uuid, u.email
ORDER BY sales_count DESC, revenue DESC;

-- name: GetFranchiseRecentSales :many
SELECT 
    v.uuid AS vente_uuid,
    v.facture_uuid,
    u.email AS vendeur_email,
    p.name AS produit_name,
    p.price AS produit_price
FROM ventes v
JOIN users u ON v.vendeur_uuid = u.uuid
JOIN produits p ON v.produit_uuid = p.uuid
WHERE v.franchise_uuid = $1
ORDER BY v.uuid DESC
LIMIT $2;
