-- name: CreateProduit :one
INSERT INTO produits (uuid) RETURNING *;

-- name: GetProduitByUUID :one
SELECT * FROM produits 
WHERE uuid = $1;

-- name: ListProduits :many
SELECT * FROM produits;

-- name: DeleteProduit :exec
DELETE FROM produits 
WHERE uuid = $1;

---------------------------------------------
-- FACTURES

-- name: CreateFacture :one
INSERT INTO factures (uuid) 
VALUES (COALESCE($1, gen_random_uuid()))
RETURNING *;

-- name: GetFactureByUUID :one
SELECT * FROM factures 
WHERE uuid = $1;

-- name: DeleteFacture :exec
DELETE FROM factures 
WHERE uuid = $1;

---------------------------------------------
-- VENTES

-- name: CreateVente :one
INSERT INTO ventes (uuid, facture_uuid, vendeur_uuid, franchise_uuid, produit_uuid)
VALUES (COALESCE($1, gen_random_uuid()), $2, $3, $4, $5)
RETURNING *;

-- name: GetVenteByUUID :one
SELECT * FROM ventes 
WHERE uuid = $1;

-- name: ListVentesByFranchise :many
SELECT * FROM ventes 
WHERE franchise_uuid = $1;

-- name: ListVentesByVendeur :many
SELECT * FROM ventes 
WHERE vendeur_uuid = $1;

-- name: ListVentesByFacture :many
SELECT * FROM ventes 
WHERE facture_uuid = $1;

-- name: DeleteVente :exec
DELETE FROM ventes 
WHERE uuid = $1;

-- name: GetVenteDetailsWithVendeurEmail :one
SELECT 
    v.uuid AS vente_uuid,
    v.facture_uuid,
    v.vendeur_uuid,
    u.email AS vendeur_email,
    v.franchise_uuid,
    v.produit_uuid
FROM ventes v
JOIN users u ON v.vendeur_uuid = u.uuid
WHERE v.uuid = $1;
