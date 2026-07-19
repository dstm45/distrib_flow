-- name: GetUserByEmail :one
SELECT uuid, password_hash FROM users WHERE email=$1;

-- name: NewUser :one
INSERT INTO users (email, password_hash, role) VALUES($1, $2, $3)
RETURNING *;

-- name: NewAdmin :exec
INSERT INTO admins (user_uuid) VALUES ($1);

-- name: GetUserDataByUUID :one
SELECT * FROM user_public_data WHERE uuid=$1;

-- name: GetAdminData :one
SELECT u.* FROM admins a
JOIN user_public_data u on u.UUID=a.uuid
WHERE a.user_uuid=$1;

