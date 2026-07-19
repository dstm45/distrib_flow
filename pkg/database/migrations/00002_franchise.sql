-- +goose Up
CREATE TABLE franchises(
  uuid UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE franchise_owners(
	user_uuid UUID NOT NULL REFERENCES users(uuid) ON DELETE CASCADE,
	franchise_uuid UUID NOT NULL REFERENCES franchises(uuid) ON DELETE CASCADE,
	PRIMARY KEY (user_uuid, franchise_uuid)
);

CREATE TABLE vendeurs(
	user_uuid UUID NOT NULL PRIMARY KEY REFERENCES users(uuid) ON DELETE CASCADE,
	franchise_uuid UUID NOT NULL REFERENCES franchises(uuid) ON DELETE CASCADE
);

-- +goose Down
DROP TABLE franchise_owners;
DROP TABLE vendeurs;
DROP TABLE franchises;
