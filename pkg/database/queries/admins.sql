-- name: CreateAdmin :exec
INSERT INTO admins (user_uuid) VALUES ($1);

-- name: GetAdminByUUID :one
SELECT * FROM admins WHERE user_uuid = $1;

-- name: DeleteAdmin :exec
DELETE FROM admins WHERE user_uuid = $1;
