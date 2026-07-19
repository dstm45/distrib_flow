-- name: GetUserByEmail :one
SELECT uuid, password_hash FROM users WHERE email=$1;

-- name: NewUser :one
INSERT INTO users (email, password_hash, role) VALUES($1, $2, $3)
RETURNING *;

-- name: NewVendeur :exec
INSERT INTO vendeurs(user_uuid, franchise_uuid) VALUES($1, $2);

-- name: GetUserDataByUUID :one
SELECT * FROM user_public_data WHERE uuid=$1;

-- name: GetAdminData :one
SELECT u.* FROM admins a
JOIN user_public_data u on u.UUID=a.uuid
WHERE a.user_uuid=$1;

-- name: GetFranchiseOwnerData :one
SELECT u.* FROM franchise_owners fo
JOIN user_public_data u ON u.uuid = fo.user_uuid
WHERE fo.user_uuid = $1;

-- name: GetVendeurData :one
SELECT u.* FROM vendeurs v
JOIN user_public_data u ON u.uuid = v.user_uuid
WHERE v.user_uuid = $1;
