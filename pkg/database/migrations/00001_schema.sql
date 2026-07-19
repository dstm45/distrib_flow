-- +goose Up
CREATE TYPE role AS ENUM('admin', 'franchise_owner', 'vendeur');
CREATE TYPE token_status AS ENUM('active', 'used', 'blacklisted');
CREATE TYPE token_family_status AS ENUM('active', 'blacklisted');

CREATE TABLE IF NOT EXISTS users(
  uuid UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role role NOT NULL 
);

CREATE TABLE IF NOT EXISTS admins(
	user_uuid uuid NOT NULL UNIQUE REFERENCES users(uuid) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS token_families(
  id BIGSERIAL PRIMARY KEY,
  uuid uuid UNIQUE NOT NULL DEFAULT gen_random_uuid(),
  user_uuid uuid REFERENCES users(uuid) ON DELETE CASCADE NOT NULL,
  status token_family_status NOT NULL DEFAULT 'active'
);

CREATE TABLE IF NOT EXISTS tokens(
  id BIGSERIAL PRIMARY KEY,
  hash TEXT NOT NULL,
  uuid uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE,
  family uuid REFERENCES token_families(uuid) ON DELETE CASCADE NOT NULL,
  status token_status NOT NULL DEFAULT 'active'
);

CREATE VIEW user_public_data AS SELECT email, uuid, role FROM users;

-- +goose Down
DROP VIEW user_public_data;

DROP TABLE tokens;
DROP TABLE admins;
DROP TABLE token_families;
DROP TABLE users;

DROP TYPE token_status;
DROP TYPE token_family_status;
DROP TYPE role;
