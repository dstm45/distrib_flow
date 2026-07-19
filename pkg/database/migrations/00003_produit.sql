-- +goose Up
CREATE TABLE produits(
  uuid UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  price FLOAT
);

CREATE TABLE factures(
  uuid UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()
);

CREATE TABLE ventes(
  uuid UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  facture_uuid UUID NOT NULL REFERENCES factures(uuid) ON DELETE CASCADE,
  vendeur_uuid UUID NOT NULL REFERENCES vendeurs(user_uuid) ON DELETE CASCADE,
  franchise_uuid UUID NOT NULL REFERENCES franchises(uuid) ON DELETE CASCADE,
  produit_uuid UUID NOT NULL REFERENCES produits(uuid) ON DELETE CASCADE
);

CREATE INDEX idx_ventes_facture ON ventes(facture_uuid);
CREATE INDEX idx_ventes_vendeur ON ventes(vendeur_uuid);
CREATE INDEX idx_ventes_franchise ON ventes(franchise_uuid);
CREATE INDEX idx_ventes_produit ON ventes(produit_uuid);

-- +goose Down
DROP INDEX idx_ventes_facture;
DROP INDEX idx_ventes_vendeur;
DROP INDEX idx_ventes_franchise;
DROP INDEX idx_ventes_produit;

DROP TABLE if exists ventes;
DROP TABLE if exists factures;
DROP TABLE if exists produits;
