-- name: CreateFranchiseOwner :exec
INSERT INTO franchise_owners (user_uuid, franchise_uuid) VALUES ($1, $2);

-- name: GetFranchiseOwnersByFranchise :many
SELECT * FROM franchise_owners WHERE franchise_uuid = $1;

-- name: GetFranchiseOwnersByUser :many
SELECT * FROM franchise_owners WHERE user_uuid = $1;

-- name: DeleteFranchiseOwner :exec
DELETE FROM franchise_owners WHERE user_uuid = $1 AND franchise_uuid = $2;
