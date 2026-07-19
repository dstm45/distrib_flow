-- name: CreateFranchise :one
INSERT INTO franchises (uuid) 
VALUES (COALESCE($1, gen_random_uuid()))
RETURNING *;

-- name: GetFranchiseByUUID :one
SELECT * FROM franchises 
WHERE uuid = $1;

-- name: ListFranchises :many
SELECT * FROM franchises 
ORDER BY created_at DESC;

-- name: DeleteFranchise :exec
DELETE FROM franchises 
WHERE uuid = $1;

---------------------------------------------
-- FRANCHISE OWNERS

-- name: GetFranchisesByOwner :many
SELECT f.* FROM franchises f
JOIN franchise_owners fo ON f.uuid = fo.franchise_uuid
WHERE fo.user_uuid = $1;

-- name: GetOwnersByFranchise :many
SELECT user_uuid FROM franchise_owners 
WHERE franchise_uuid = $1;

-- name: RemoveFranchiseOwner :exec
DELETE FROM franchise_owners 
WHERE user_uuid = $1 AND franchise_uuid = $2;

---------------------------------------------
-- VENDEURS (SALESPEOPLE)

-- name: CreateVendeur :one
INSERT INTO vendeurs (user_uuid, franchise_uuid) 
VALUES ($1, $2)
RETURNING *;

-- name: GetVendeurByUUID :one
SELECT * FROM vendeurs 
WHERE user_uuid = $1;

-- name: ListVendeursByFranchise :many
SELECT * FROM vendeurs 
WHERE franchise_uuid = $1;

-- name: UpdateVendeurFranchise :one
UPDATE vendeurs 
SET franchise_uuid = $2 
WHERE user_uuid = $1
RETURNING *;

-- name: DeleteVendeur :exec
DELETE FROM vendeurs 
WHERE user_uuid = $1;
